import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { deleteUserMemory } from "@/lib/db-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        { success: false, error: "Memory ID is required." },
        { status: 400 }
      );
    }

    const success = await deleteUserMemory(user.userId, id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Memory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Memory removed." });
  } catch (error: unknown) {
    console.error("[DELETE /api/user/memories/[id] error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove memory." },
      { status: 500 }
    );
  }
}
