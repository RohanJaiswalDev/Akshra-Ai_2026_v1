import { NextResponse } from "next/server";
import { checkOtp, getOrCreateUser } from "@/lib/db-store";
import { createSessionCookie } from "@/lib/auth";

function getStringField(body: unknown, field: string) {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const email = getStringField(body, "email").toLowerCase();
    const otp = getStringField(body, "otp");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    // Verify OTP record with attempt tracking & cryptographic hash
    const verification = await checkOtp(email, otp);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Invalid or expired verification code." },
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
  } catch (error: unknown) {
    console.error("[verify-otp API error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to verify code. Please try again.",
      },
      { status: 500 }
    );
  }
}
