import { NextResponse } from "next/server";
import { storeOtp } from "@/lib/db-store";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.toLowerCase()?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in MongoDB (or fallback memory store)
    await storeOtp(email, otp);

    // Send email using Nodemailer
    const mailResult = await sendOtpEmail({ email, otp });

    return NextResponse.json({
      success: true,
      message: mailResult.delivered
        ? "Verification code sent to your email address."
        : "Verification code generated (Check terminal/console for code).",
      devOtp: !mailResult.delivered ? otp : undefined,
    });
  } catch (error: any) {
    console.error("[send-otp API error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to send verification code. Please try again.",
      },
      { status: 500 }
    );
  }
}
