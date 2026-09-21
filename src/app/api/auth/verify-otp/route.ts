import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkOtp, getOrCreateUser } from "@/lib/db-store";
import { signSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.toLowerCase()?.trim();
    const otp = body?.otp?.trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    // Verify OTP record
    const isValid = await checkOtp(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    // Find or create User in MongoDB / store
    const user = await getOrCreateUser(email);

    // Sign session token
    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // Set secure HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Successfully authenticated.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("[verify-otp API error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to verify code. Please try again.",
      },
      { status: 500 }
    );
  }
}
