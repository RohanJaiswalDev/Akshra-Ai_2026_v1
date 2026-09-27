import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { getUserChats, saveUserChat, clearAllUserChats } from "@/lib/db-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to sync conversations." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || undefined;
    const search = searchParams.get("search") || undefined;
    const includeArchived = searchParams.get("archived") === "true";

    const chats = await getUserChats(user.userId, {
      folder,
      search,
      includeArchived,
    });

    return NextResponse.json({ success: true, chats });
  } catch (error: unknown) {
    console.error("[GET /api/chats error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve conversation history." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to save conversation." },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "New Conversation";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = typeof body.model === "string" ? body.model : undefined;
    const folder = typeof body.folder === "string" ? body.folder : undefined;
    const isPinned = typeof body.isPinned === "boolean" ? body.isPinned : undefined;
    const isArchived = typeof body.isArchived === "boolean" ? body.isArchived : undefined;
    const id = typeof body.id === "string" ? body.id : undefined;

    const saved = await saveUserChat(user.userId, {
      id,
      title,
      model,
      folder,
      isPinned,
      isArchived,
      messages,
    });

    return NextResponse.json({ success: true, chat: saved });
  } catch (error: unknown) {
    console.error("[POST /api/chats error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save conversation." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await clearAllUserChats(user.userId);
    return NextResponse.json({ success: true, message: "All conversations cleared." });
  } catch (error: unknown) {
    console.error("[DELETE /api/chats error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear conversations." },
      { status: 500 }
    );
  }
}
