import { NextResponse } from "next/server";
import { createSessionCookie, getCurrentUserFromCookie } from "@/lib/auth";
import { findUserById } from "@/lib/db-store";

export async function GET() {
  try {
    const session = await getCurrentUserFromCookie();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // A valid, signed session is the source of truth for authentication.
    // Renew the persistent session cookie so active users remain logged in indefinitely.
    try {
      await createSessionCookie(session);
    } catch (cookieError) {
      console.warn("[auth/me] Non-critical cookie renewal warning:", cookieError);
    }

    const userRecord = await findUserById(session.userId).catch(() => null);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: userRecord?.name || session.name || session.email.split("@")[0],
        firstName: userRecord?.firstName || session.firstName || "",
        lastName: userRecord?.lastName || session.lastName || "",
        mobileNumber: userRecord?.mobileNumber || session.mobileNumber || "",
      },
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    console.error("[auth/me API error]:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
