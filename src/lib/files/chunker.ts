import { FileChunk } from "@/types/files";

const DEFAULT_CHUNK_SIZE = 1400; // characters (~350 tokens)
const DEFAULT_CHUNK_OVERLAP = 150; // characters (~35-40 tokens)

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits plain or document text into semantic overlapping chunks
 */
export function chunkText(
  text: string,
  fileId: string,
  fileName: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): FileChunk[] {
  const clean = text.trim();
  if (!clean) return [];

  if (clean.length <= chunkSize) {
    return [
      {
        id: `${fileId}-chunk-0`,
        fileId,
        chunkIndex: 0,
        text: clean,
        tokenEstimate: estimateTokens(clean),
        metadata: { sourceFile: fileName },
      },
    ];
  }

  const chunks: FileChunk[] = [];
  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < clean.length) {
    let endIndex = Math.min(startIndex + chunkSize, clean.length);

    // If not at the end of text, find a natural boundary to break
    if (endIndex < clean.length) {
      // Look for paragraph break
      const paragraphBreak = clean.lastIndexOf("\n\n", endIndex);
      if (paragraphBreak > startIndex + chunkSize * 0.5) {
        endIndex = paragraphBreak + 2;
      } else {
        // Look for newline
        const lineBreak = clean.lastIndexOf("\n", endIndex);
        if (lineBreak > startIndex + chunkSize * 0.5) {
          endIndex = lineBreak + 1;
        } else {
          // Look for sentence end
          const sentenceBreak = clean.slice(startIndex, endIndex).search(/[.!?]\s+(?=[A-Z0-9])/);
          if (sentenceBreak !== -1 && startIndex + sentenceBreak > startIndex + chunkSize * 0.5) {
            endIndex = startIndex + sentenceBreak + 2;
          } else {
            // Fallback to space
            const spaceBreak = clean.lastIndexOf(" ", endIndex);
            if (spaceBreak > startIndex + chunkSize * 0.5) {
              endIndex = spaceBreak + 1;
            }
          }
        }
      }
    }

    const chunkContent = clean.slice(startIndex, endIndex).trim();
    if (chunkContent) {
      chunks.push({
        id: `${fileId}-chunk-${chunkIdx}`,
        fileId,
        chunkIndex: chunkIdx,
        text: chunkContent,
        tokenEstimate: estimateTokens(chunkContent),
        metadata: { sourceFile: fileName },
      });
      chunkIdx++;
    }

    if (endIndex >= clean.length) break;

    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }

  return chunks;
}

/**
 * Chunks spreadsheet or CSV data preserving header columns on every chunk
 */
export function chunkTableData(
  headers: string[],
  rows: Array<Array<unknown>>,
  fileId: string,
  fileName: string,
  sheetName?: string,
  rowsPerChunk: number = 25
): FileChunk[] {
  if (rows.length === 0) return [];

  const chunks: FileChunk[] = [];
  const headerLine = headers.length > 0 ? headers.join(" | ") : "";
  const dividerLine = headers.length > 0 ? headers.map(() => "---").join(" | ") : "";

  let chunkIdx = 0;
  for (let i = 0; i < rows.length; i += rowsPerChunk) {
    const slice = rows.slice(i, i + rowsPerChunk);
    const rowLines = slice.map((row) =>
      Array.isArray(row)
        ? row.map((cell) => (cell !== null && cell !== undefined ? String(cell) : "")).join(" | ")
        : String(row)
    );

    const sheetPrefix = sheetName ? `[Sheet: ${sheetName}] (Rows ${i + 1} to ${i + slice.length} of ${rows.length})\n` : `(Rows ${i + 1} to ${i + slice.length} of ${rows.length})\n`;
    const tableText = `${sheetPrefix}${headerLine}\n${dividerLine}\n${rowLines.join("\n")}`;

    chunks.push({
      id: `${fileId}-chunk-${chunkIdx}`,
      fileId,
      chunkIndex: chunkIdx,
      text: tableText,
      tokenEstimate: estimateTokens(tableText),
      metadata: {
        sourceFile: fileName,
        sheetName,
        startRow: i + 1,
        endRow: i + slice.length,
      },
    });
    chunkIdx++;
  }

  return chunks;
}
