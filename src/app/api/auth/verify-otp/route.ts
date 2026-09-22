import { NextResponse } from "next/server";
import { checkOtp, getOrCreateUser } from "@/lib/db-store";
import { createSessionCookie } from "@/lib/auth";

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

    // Create a persistent session after a successful OTP verification.
    await createSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
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
