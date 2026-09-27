export type FileCategory =
  | "pdf"
  | "docx"
  | "spreadsheet"
  | "csv"
  | "text"
  | "json"
  | "image";

export interface FileChunk {
  id: string;
  fileId: string;
  chunkIndex: number;
  text: string;
  tokenEstimate: number;
  metadata?: {
    sourceFile: string;
    pageNumber?: number;
    sheetName?: string;
    startRow?: number;
    endRow?: number;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  url: string;
  extractedText: string;
  summary: string;
  chunksCount: number;
  pageCount?: number;
  rowCount?: number;
  sheetNames?: string[];
  thumbnailUrl?: string;
  createdAt: string;
}

export interface ParsedDocument {
  category: FileCategory;
  extractedText: string;
  summary: string;
  pageCount?: number;
  rowCount?: number;
  sheetNames?: string[];
  thumbnailUrl?: string;
  chunks: FileChunk[];
  metadata?: Record<string, unknown>;
}

export interface FileUploadResponse {
  success: boolean;
  attachment: FileAttachment;
}
