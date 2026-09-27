import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { getUserMemories, addUserMemory, clearAllUserMemories } from "@/lib/db-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const memories = await getUserMemories(user.userId);
    return NextResponse.json({ success: true, memories });
  } catch (error: unknown) {
    console.error("[GET /api/user/memories error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve memories." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Memory content cannot be empty." },
        { status: 400 }
      );
    }

    const memory = await addUserMemory(user.userId, content);
    return NextResponse.json({ success: true, memory });
  } catch (error: unknown) {
    console.error("[POST /api/user/memories error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save memory." },
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

    await clearAllUserMemories(user.userId);
    return NextResponse.json({ success: true, message: "All memories cleared." });
  } catch (error: unknown) {
    console.error("[DELETE /api/user/memories error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear memories." },
      { status: 500 }
    );
  }
}
