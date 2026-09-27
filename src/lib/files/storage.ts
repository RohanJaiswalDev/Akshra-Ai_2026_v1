import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";
import { FileAttachment, ParsedDocument } from "@/types/files";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const METADATA_DIR = path.join(UPLOADS_DIR, ".metadata");

// In-memory cache for fast lookup
declare global {
  var __akshraFileCache: Map<string, FileAttachment> | undefined;
}

if (!global.__akshraFileCache) {
  global.__akshraFileCache = new Map<string, FileAttachment>();
}
const fileCache = global.__akshraFileCache;

/**
 * Ensure upload directories exist
 */
function ensureDirectories() {
  if (!fsSync.existsSync(UPLOADS_DIR)) {
    fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(METADATA_DIR)) {
    fsSync.mkdirSync(METADATA_DIR, { recursive: true });
  }
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

/**
 * Save an uploaded file and its parsed representation
 */
export async function saveFile(
  fileId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  parsed: ParsedDocument,
  userId?: string
): Promise<FileAttachment> {
  ensureDirectories();

  // Sanitize filename extension
  const ext = path.extname(originalName) || "";
  const safeStorageName = `${fileId}${ext}`;
  const filePath = path.join(UPLOADS_DIR, safeStorageName);
  const metadataPath = path.join(METADATA_DIR, `${fileId}.json`);

  // Write file to disk
  await fs.writeFile(filePath, buffer);

  const attachment: FileAttachment = {
    id: fileId,
    name: originalName,
    originalName,
    size: buffer.length,
    mimeType,
    category: parsed.category,
    url: `/api/files/${fileId}`,
    extractedText: parsed.extractedText,
    summary: parsed.summary,
    chunksCount: parsed.chunks.length,
    pageCount: parsed.pageCount,
    rowCount: parsed.rowCount,
    sheetNames: parsed.sheetNames,
    thumbnailUrl: parsed.thumbnailUrl,
    createdAt: new Date().toISOString(),
  };

  // Cache in memory
  fileCache.set(fileId, attachment);

  // Write metadata JSON to disk for persistence across server restarts
  const metadataPayload = {
    ...attachment,
    userId,
    storagePath: filePath,
    chunks: parsed.chunks,
  };
  await fs.writeFile(metadataPath, JSON.stringify(metadataPayload, null, 2), "utf-8");

  return attachment;
}

/**
 * Retrieve file metadata and chunks
 */
export async function getFileMetadata(fileId: string): Promise<{
  attachment: FileAttachment;
  storagePath?: string;
  chunks?: ParsedDocument["chunks"];
} | null> {
  // Check memory cache first
  const cached = fileCache.get(fileId);
  if (cached) {
    const ext = path.extname(cached.originalName) || "";
    const storagePath = path.join(UPLOADS_DIR, `${fileId}${ext}`);
    return { attachment: cached, storagePath };
  }

  // Load from disk metadata
  const metadataPath = path.join(METADATA_DIR, `${fileId}.json`);
  try {
    const raw = await fs.readFile(metadataPath, "utf-8");
    const parsed = JSON.parse(raw);
    const attachment: FileAttachment = {
      id: parsed.id,
      name: parsed.name,
      originalName: parsed.originalName,
      size: parsed.size,
      mimeType: parsed.mimeType,
      category: parsed.category,
      url: parsed.url,
      extractedText: parsed.extractedText,
      summary: parsed.summary,
      chunksCount: parsed.chunksCount,
      pageCount: parsed.pageCount,
      rowCount: parsed.rowCount,
      sheetNames: parsed.sheetNames,
      thumbnailUrl: parsed.thumbnailUrl,
      createdAt: parsed.createdAt,
    };
    fileCache.set(fileId, attachment);
    return {
      attachment,
      storagePath: parsed.storagePath,
      chunks: parsed.chunks,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieve raw file buffer for download / display
 */
export async function getFileBinary(
  fileId: string
): Promise<{ buffer: Buffer; attachment: FileAttachment } | null> {
  const meta = await getFileMetadata(fileId);
  if (!meta) return null;

  const ext = path.extname(meta.attachment.originalName) || "";
  const filePath = meta.storagePath || path.join(UPLOADS_DIR, `${fileId}${ext}`);

  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, attachment: meta.attachment };
  } catch (err) {
    console.error(`[getFileBinary error for ${fileId}]:`, err);
    return null;
  }
}
