import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { findUserById } from "@/lib/db-store";

export async function GET() {
  try {
    const session = await getCurrentUserFromCookie();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = await findUserById(session.userId);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("[auth/me API error]:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
