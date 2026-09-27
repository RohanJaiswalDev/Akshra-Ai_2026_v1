import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { parseFileBuffer } from "@/lib/files/parser";
import { generateFileId, saveFile } from "@/lib/files/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required to upload files." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get("file");

    if (!fileEntry || typeof fileEntry === "string" || !(fileEntry instanceof Blob)) {
      return NextResponse.json(
        { error: "No valid file was provided in the request." },
        { status: 400 }
      );
    }

    const file = fileEntry as File;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 25 MB limit (${Math.round(file.size / 1024 / 1024)} MB).` },
        { status: 413 }
      );
    }

    const filename = file.name || "untitled_file";
    const mimeType = file.type || "application/octet-stream";
    const fileId = generateFileId();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse and chunk document (failsafe, never throws unhandled exception)
    const parsed = await parseFileBuffer(buffer, filename, mimeType, fileId);

    // Save to storage
    const attachment = await saveFile(
      fileId,
      buffer,
      filename,
      mimeType,
      parsed,
      session.userId
    );

    return NextResponse.json(
      {
        success: true,
        attachment,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to process and store uploaded file.";
    console.error("[upload error]:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
