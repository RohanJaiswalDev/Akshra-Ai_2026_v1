import { extractText } from "unpdf";
import * as mammoth from "mammoth";
import * as xlsx from "xlsx";
import { FileCategory, ParsedDocument } from "@/types/files";
import { chunkText, chunkTableData } from "./chunker";

/**
 * Detect file category from MIME type and filename extension
 */
export function detectFileCategory(mimeType: string, filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    ext === "docx" ||
    ext === "doc"
  ) {
    return "docx";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    return "spreadsheet";
  }

  if (mimeType === "text/csv" || ext === "csv") return "csv";

  if (mimeType === "application/json" || ext === "json") return "json";

  if (
    mimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)
  ) {
    return "image";
  }

  return "text";
}

/**
 * Parse a buffer into extracted text, chunks, and metadata
 */
export async function parseFileBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  fileId: string
): Promise<ParsedDocument> {
  try {
    const category = detectFileCategory(mimeType, filename);

    switch (category) {
      case "pdf":
        return await parsePdf(buffer, filename, fileId);

      case "docx":
        return await parseDocx(buffer, filename, fileId);

      case "spreadsheet":
        return await parseSpreadsheet(buffer, filename, fileId);

      case "csv":
        return await parseCsv(buffer, filename, fileId);

      case "json":
        return await parseJson(buffer, filename, fileId);

      case "image":
        return await parseImage(buffer, filename, mimeType, fileId);

      case "text":
      default:
        return await parsePlainText(buffer, filename, fileId);
    }
  } catch (error) {
    console.error(`[parseFileBuffer fallback for ${filename}]:`, error);
    return parsePlainText(buffer, filename, fileId);
  }
}

/**
 * PDF parser using unpdf
 */
async function parsePdf(buffer: Buffer, filename: string, fileId: string): Promise<ParsedDocument> {
  try {
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8, { mergePages: false });
    const totalPages = result.totalPages || 1;
    const pages = Array.isArray(result.text) ? result.text : [result.text || ""];

    // Format text with explicit page markers
    const formattedPages: string[] = [];
    pages.forEach((pageText, idx) => {
      const pageNum = idx + 1;
      const clean = pageText.trim();
      if (clean) {
        formattedPages.push(`--- Page ${pageNum} of ${totalPages} ---\n${clean}`);
      }
    });

    const fullText = formattedPages.join("\n\n");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const summary = `PDF document with ${totalPages} page${totalPages === 1 ? "" : "s"} (~${wordCount.toLocaleString()} words).`;

    const chunks = chunkText(fullText, fileId, filename);

    return {
      category: "pdf",
      extractedText: fullText,
      summary,
      pageCount: totalPages,
      chunks,
    };
  } catch (error) {
    console.error("[parsePdf error]:", error);
    const fallbackText = `[PDF Document: ${filename} - extraction encountered error: ${String(error)}]`;
    return {
      category: "pdf",
      extractedText: fallbackText,
      summary: `PDF document (${filename}) - partial extraction.`,
      pageCount: 1,
      chunks: chunkText(fallbackText, fileId, filename),
    };
  }
}

/**
 * DOCX parser using mammoth
 */
async function parseDocx(buffer: Buffer, filename: string, fileId: string): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const fullText = (result.value || "").trim();
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const summary = `Word document (.docx) with ~${wordCount.toLocaleString()} words.`;

    const chunks = chunkText(fullText, fileId, filename);

    return {
      category: "docx",
      extractedText: fullText,
      summary,
      chunks,
    };
  } catch (error) {
    console.error("[parseDocx error]:", error);
    const fallbackText = `[Word Document: ${filename} - extraction error: ${String(error)}]`;
    return {
      category: "docx",
      extractedText: fallbackText,
      summary: `Word document (${filename}) - extraction failed.`,
      chunks: chunkText(fallbackText, fileId, filename),
    };
  }
}

/**
 * Excel Spreadsheet parser using SheetJS (xlsx)
 */
async function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
  fileId: string
): Promise<ParsedDocument> {
  try {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames || [];
    let totalRows = 0;
    const allChunks = [];
    const textSections: string[] = [];

    textSections.push(`Excel Workbook: "${filename}" (${sheetNames.length} sheet${sheetNames.length === 1 ? "" : "s"}: ${sheetNames.join(", ")})\n`);

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Extract raw rows
      const rawData = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      if (!rawData || rawData.length === 0) {
        textSections.push(`\n=== Sheet: ${sheetName} (Empty) ===\n`);
        continue;
      }

      const headers = (rawData[0] as unknown[] || []).map((h) => String(h ?? ""));
      const dataRows = rawData.slice(1);
      totalRows += dataRows.length;

      textSections.push(
        `\n=== Sheet: ${sheetName} (${dataRows.length} rows, ${headers.length} columns) ===\n` +
        `Columns: ${headers.filter(Boolean).join(", ")}\n`
      );

      // Render preview table of the first 25 rows into main text
      const previewRows = dataRows.slice(0, 25);
      if (headers.length > 0) {
        textSections.push(headers.join(" | "));
        textSections.push(headers.map(() => "---").join(" | "));
      }
      for (const row of previewRows) {
        const line = Array.isArray(row)
          ? row.map((cell) => (cell !== null && cell !== undefined ? String(cell) : "")).join(" | ")
          : String(row);
        textSections.push(line);
      }
      if (dataRows.length > 25) {
        textSections.push(`... and ${dataRows.length - 25} more rows in sheet "${sheetName}".`);
      }

      // Create chunks preserving headers for every chunk
      const sheetChunks = chunkTableData(headers, dataRows, fileId, filename, sheetName, 30);
      allChunks.push(...sheetChunks);
    }

    const fullText = textSections.join("\n");
    const summary = `Excel spreadsheet with ${sheetNames.length} sheet${sheetNames.length === 1 ? "" : "s"} (${sheetNames.join(", ")}), total ~${totalRows.toLocaleString()} rows.`;

    return {
      category: "spreadsheet",
      extractedText: fullText,
      summary,
      sheetNames,
      rowCount: totalRows,
      chunks: allChunks.length > 0 ? allChunks : chunkText(fullText, fileId, filename),
    };
  } catch (error) {
    console.error("[parseSpreadsheet error]:", error);
    const fallback = `[Excel file ${filename} - extraction error: ${String(error)}]`;
    return {
      category: "spreadsheet",
      extractedText: fallback,
      summary: `Excel file (${filename}) - extraction failed.`,
      chunks: chunkText(fallback, fileId, filename),
    };
  }
}

/**
 * CSV parser using xlsx
 */
async function parseCsv(buffer: Buffer, filename: string, fileId: string): Promise<ParsedDocument> {
  try {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;

    if (!sheet) {
      const rawString = buffer.toString("utf-8");
      return parsePlainText(buffer, filename, fileId);
    }

    const rawData = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    const headers = (rawData[0] as unknown[] || []).map((h) => String(h ?? ""));
    const dataRows = rawData.slice(1);
    const totalRows = dataRows.length;

    const textSections: string[] = [];
    textSections.push(`CSV File: "${filename}" (${totalRows} rows, ${headers.length} columns)`);
    textSections.push(`Columns: ${headers.filter(Boolean).join(", ")}\n`);

    // Render markdown preview table
    if (headers.length > 0) {
      textSections.push(headers.join(" | "));
      textSections.push(headers.map(() => "---").join(" | "));
    }
    const previewRows = dataRows.slice(0, 40);
    for (const row of previewRows) {
      const line = Array.isArray(row)
        ? row.map((cell) => (cell !== null && cell !== undefined ? String(cell) : "")).join(" | ")
        : String(row);
      textSections.push(line);
    }
    if (dataRows.length > 40) {
      textSections.push(`... and ${dataRows.length - 40} more rows.`);
    }

    const fullText = textSections.join("\n");
    const summary = `CSV dataset with ${headers.length} columns and ${totalRows.toLocaleString()} rows.`;
    const chunks = chunkTableData(headers, dataRows, fileId, filename, undefined, 30);

    return {
      category: "csv",
      extractedText: fullText,
      summary,
      rowCount: totalRows,
      chunks: chunks.length > 0 ? chunks : chunkText(fullText, fileId, filename),
    };
  } catch (error) {
    console.error("[parseCsv error]:", error);
    return parsePlainText(buffer, filename, fileId);
  }
}

/**
 * JSON parser
 */
async function parseJson(buffer: Buffer, filename: string, fileId: string): Promise<ParsedDocument> {
  const rawString = buffer.toString("utf-8");
  try {
    const parsed = JSON.parse(rawString);
    let summary = "JSON file.";
    let rowCount: number | undefined;

    if (Array.isArray(parsed)) {
      rowCount = parsed.length;
      summary = `JSON array with ${parsed.length.toLocaleString()} items.`;
    } else if (typeof parsed === "object" && parsed !== null) {
      const keys = Object.keys(parsed);
      summary = `JSON object with ${keys.length} keys: ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? "..." : ""}.`;
    }

    // Format indented json
    const prettyJson = JSON.stringify(parsed, null, 2);
    const chunks = chunkText(prettyJson, fileId, filename);

    return {
      category: "json",
      extractedText: prettyJson,
      summary,
      rowCount,
      chunks,
    };
  } catch {
    // If invalid JSON, treat as plain text
    return parsePlainText(buffer, filename, fileId);
  }
}

/**
 * Plain text / Markdown parser
 */
async function parsePlainText(
  buffer: Buffer,
  filename: string,
  fileId: string
): Promise<ParsedDocument> {
  const fullText = buffer.toString("utf-8").trim();
  const lines = fullText.split(/\r?\n/);
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const summary = `Text document with ${lines.length} lines (~${wordCount.toLocaleString()} words).`;
  const chunks = chunkText(fullText, fileId, filename);

  return {
    category: "text",
    extractedText: fullText,
    summary,
    rowCount: lines.length,
    chunks,
  };
}

/**
 * Image parser with Base64 data URL for vision models
 */
async function parseImage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  fileId: string
): Promise<ParsedDocument> {
  const base64 = buffer.toString("base64");
  const validMime = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const dataUrl = `data:${validMime};base64,${base64}`;

  const kbSize = Math.round(buffer.length / 1024);
  const summary = `Image file "${filename}" (${kbSize} KB, ${validMime}).`;
  const descriptiveText = `[Attached Image: ${filename} | Size: ${kbSize} KB | Type: ${validMime}]`;

  return {
    category: "image",
    extractedText: descriptiveText,
    summary,
    thumbnailUrl: dataUrl,
    chunks: [
      {
        id: `${fileId}-chunk-0`,
        fileId,
        chunkIndex: 0,
        text: descriptiveText,
        tokenEstimate: 50,
        metadata: { sourceFile: filename },
      },
    ],
  };
}
