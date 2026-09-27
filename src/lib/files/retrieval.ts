import { FileAttachment, FileChunk } from "@/types/files";
import { getFileMetadata } from "./storage";
import { estimateTokens } from "./chunker";

// Maximum context tokens dedicated to file context in an LLM call (~16,000 tokens)
const MAX_FILE_CONTEXT_TOKENS = 16_000;

/**
 * Basic tokenizer for term scoring
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/**
 * Score a chunk's relevance to a user query
 */
function scoreChunkRelevance(queryTerms: string[], chunkText: string): number {
  if (queryTerms.length === 0) return 1;

  const lower = chunkText.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    if (lower.includes(term)) {
      score += 10;
      // Bonus for exact occurrences count (up to 5)
      const matches = (lower.match(new RegExp(`\\b${term}\\b`, "g")) || []).length;
      score += Math.min(matches * 2, 10);
    }
  }

  // Bonus for error-detection queries
  if (queryTerms.some((t) => ["error", "errors", "bug", "issue", "null", "missing", "invalid", "wrong", "fail", "check"].includes(t))) {
    if (/\b(null|undefined|nan|error|invalid|empty|na|n\/a|#value!|#ref!|#n\/a)\b/i.test(chunkText)) {
      score += 15;
    }
  }

  // Bonus for summary/analysis queries
  if (queryTerms.some((t) => ["summarize", "summary", "overview", "analyze", "analysis", "explain", "key", "main"].includes(t))) {
    // Give weight to headers, sheet summaries, or first page chunks
    if (chunkText.includes("=== Sheet:") || chunkText.includes("--- Page 1") || chunkText.includes("Columns:")) {
      score += 10;
    }
  }

  return score;
}

/**
 * Retrieve and assemble relevant file context for the AI prompt
 */
export async function retrieveFileContext(
  userQuery: string,
  attachments: FileAttachment[]
): Promise<{
  formattedContext: string;
  totalTokens: number;
  hasImages: boolean;
  imageUrls: string[];
}> {
  if (!attachments || attachments.length === 0) {
    return {
      formattedContext: "",
      totalTokens: 0,
      hasImages: false,
      imageUrls: [],
    };
  }

  const queryTerms = tokenize(userQuery);
  const contextSections: string[] = [];
  let totalTokenCount = 0;
  const imageUrls: string[] = [];
  let hasImages = false;

  const budgetPerFile = Math.floor(MAX_FILE_CONTEXT_TOKENS / attachments.length);

  for (let i = 0; i < attachments.length; i++) {
    const file = attachments[i];

    if (file.category === "image") {
      hasImages = true;
      if (file.thumbnailUrl) {
        imageUrls.push(file.thumbnailUrl);
      }
      contextSections.push(
        `[ATTACHED FILE ${i + 1}/${attachments.length}: "${file.name}" (Image, ${Math.round(file.size / 1024)} KB)]\n` +
        `Note: This image has been visually attached for multimodal analysis.\n`
      );
      continue;
    }

    // Load full metadata and chunks from storage
    const meta = await getFileMetadata(file.id);
    const chunks: FileChunk[] = meta?.chunks || [];
    const extractedText = file.extractedText || meta?.attachment.extractedText || "";
    const rawTokens = estimateTokens(extractedText);

    const header =
      `\n======================================================\n` +
      `[ATTACHED FILE ${i + 1}/${attachments.length}: "${file.name}"]\n` +
      `Category: ${file.category.toUpperCase()} | Size: ${Math.round(file.size / 1024)} KB\n` +
      `Summary: ${file.summary}\n` +
      (file.sheetNames ? `Sheets: ${file.sheetNames.join(", ")}\n` : "") +
      (file.rowCount ? `Total Rows: ${file.rowCount.toLocaleString()}\n` : "") +
      (file.pageCount ? `Total Pages: ${file.pageCount}\n` : "") +
      `======================================================\n`;

    // Case 1: File is small enough to fit within budget entirely
    if (rawTokens <= budgetPerFile || chunks.length <= 1) {
      contextSections.push(`${header}\n[Full Content]:\n${extractedText}\n`);
      totalTokenCount += rawTokens + estimateTokens(header);
      continue;
    }

    // Case 2: File is large -> Rank chunks with relevance retrieval
    const scoredChunks = chunks.map((chunk) => ({
      chunk,
      score: scoreChunkRelevance(queryTerms, chunk.text),
    }));

    // Sort by relevance score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // Pick top chunks within file budget
    const selectedChunks: FileChunk[] = [];
    let accumulatedTokens = estimateTokens(header);

    for (const item of scoredChunks) {
      if (accumulatedTokens + item.chunk.tokenEstimate > budgetPerFile) {
        break;
      }
      selectedChunks.push(item.chunk);
      accumulatedTokens += item.chunk.tokenEstimate;
    }

    // Sort selected chunks back into logical document order (by chunkIndex)
    selectedChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    const assembledSections = selectedChunks
      .map(
        (c) =>
          `[Section/Chunk ${c.chunkIndex + 1} of ${chunks.length}${c.metadata?.sheetName ? ` | Sheet: ${c.metadata.sheetName}` : ""}${c.metadata?.startRow ? ` | Rows: ${c.metadata.startRow}-${c.metadata.endRow}` : ""}]\n${c.text}`
      )
      .join("\n\n---\n\n");

    contextSections.push(
      `${header}\n[Retrieved ${selectedChunks.length} most relevant sections of ${chunks.length} total sections]:\n\n${assembledSections}\n`
    );
    totalTokenCount += accumulatedTokens;
  }

  const finalFormattedContext = contextSections.length > 0
    ? `\n\n### USER ATTACHED FILE(S) CONTEXT\nThe user has uploaded the following files to this conversation. Analyze the data thoroughly and use it to answer the user's questions:\n${contextSections.join("\n")}\n### END ATTACHED FILE(S) CONTEXT\n\n`
    : "";

  return {
    formattedContext: finalFormattedContext,
    totalTokens: totalTokenCount,
    hasImages,
    imageUrls,
  };
}
