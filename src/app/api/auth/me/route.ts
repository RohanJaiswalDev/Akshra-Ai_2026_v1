import { NextResponse } from "next/server";
import { createSessionCookie, getCurrentUserFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentUserFromCookie();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // A valid, signed session is the source of truth for authentication. Do
    // not log a user out merely because MongoDB is unavailable or a serverless
    // instance restarted and its development fallback memory was cleared.
    await createSessionCookie(session);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name || session.email.split("@")[0],
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[auth/me API error]:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
