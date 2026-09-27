import { NextRequest, NextResponse } from "next/server";
import { getFileBinary } from "@/lib/files/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    if (!fileId) {
      return NextResponse.json({ error: "Missing file ID." }, { status: 400 });
    }

    const result = await getFileBinary(fileId);
    if (!result) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const { buffer, attachment } = result;
    const isImage = attachment.mimeType.startsWith("image/");
    const isPdf = attachment.mimeType === "application/pdf";
    const searchParams = req.nextUrl.searchParams;
    const forceDownload = searchParams.get("download") === "1";

    const disposition = forceDownload || (!isImage && !isPdf)
      ? `attachment; filename="${encodeURIComponent(attachment.originalName)}"`
      : `inline; filename="${encodeURIComponent(attachment.originalName)}"`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[file retrieval error]:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
