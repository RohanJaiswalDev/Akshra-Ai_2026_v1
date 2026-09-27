import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { storeOtp } from "@/lib/db-store";
import { sendOtpEmail } from "@/lib/mailer";

function getEmail(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>).email;
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

export async function POST(req: Request) {
  try {
    const email = getEmail(await req.json());

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Generate 6-digit numeric OTP
    const otp = randomInt(100_000, 1_000_000).toString();

    // Send email using Nodemailer
    const mailResult = await sendOtpEmail({ email, otp });

    if (!mailResult.delivered && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Email delivery is not configured. Please try again later." },
        { status: 503 }
      );
    }

    // Store an OTP only after it can be delivered (or in explicit development mode).
    await storeOtp(email, otp);

    return NextResponse.json({
      success: true,
      message: mailResult.delivered
        ? "Verification code sent to your email address."
        : "Verification code generated (Check terminal/console for code).",
      devOtp: !mailResult.delivered && process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error: unknown) {
    console.error("[send-otp API error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send verification code. Please try again.",
      },
      { status: 500 }
    );
  }
}
