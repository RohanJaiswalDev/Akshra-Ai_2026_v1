import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { storeOtp, checkOtpRateLimit, findUserByEmail } from "@/lib/db-store";
import { sendOtpEmail } from "@/lib/mailer";

function getEmail(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>).email;
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json();
    const email = getEmail(rawBody);
    const type = typeof (rawBody as Record<string, unknown>)?.type === "string"
      ? (rawBody as Record<string, unknown>).type
      : "";
    const name = typeof (rawBody as Record<string, unknown>)?.name === "string"
      ? ((rawBody as Record<string, unknown>).name as string).trim()
      : undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (type === "signup") {
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "An account with this email already exists. Please log in instead." },
          { status: 400 }
        );
      }
    } else if (type === "login") {
      const existingUser = await findUserByEmail(email);
      if (!existingUser) {
        return NextResponse.json(
          { success: false, error: "No account found with this email. Please sign up first." },
          { status: 404 }
        );
      }
    }

    // Rate limiting: Max 3 OTP requests / 15 minutes / email
    const rateLimit = checkOtpRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many verification requests. Please wait ${rateLimit.waitSeconds || 60} seconds before requesting another code.`,
        },
        { status: 429 }
      );
    }

    // Generate 6-digit numeric OTP
    const otp = randomInt(100_000, 1_000_000).toString();

    // Send email using Nodemailer
    const mailResult = await sendOtpEmail({ email, otp, name });

    if (!mailResult.delivered && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Email delivery is not configured. Please try again later." },
        { status: 503 }
      );
    }

    // Store an OTP securely
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
