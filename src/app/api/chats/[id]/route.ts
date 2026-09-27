import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { updateUserChat, deleteUserChat } from "@/lib/db-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Chat ID is required." },
        { status: 400 }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid update data." },
        { status: 400 }
      );
    }

    const updates: {
      title?: string;
      folder?: string;
      isPinned?: boolean;
      isArchived?: boolean;
    } = {};

    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.folder === "string") updates.folder = body.folder.trim();
    if (typeof body.isPinned === "boolean") updates.isPinned = body.isPinned;
    if (typeof body.isArchived === "boolean") updates.isArchived = body.isArchived;

    const updated = await updateUserChat(user.userId, id, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Chat not found or unauthorized." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, chat: updated });
  } catch (error: unknown) {
    console.error("[PATCH /api/chats/[id] error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update chat." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Chat ID is required." },
        { status: 400 }
      );
    }

    const success = await deleteUserChat(user.userId, id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Chat not found or already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Chat deleted." });
  } catch (error: unknown) {
    console.error("[DELETE /api/chats/[id] error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete chat." },
      { status: 500 }
    );
  }
}
