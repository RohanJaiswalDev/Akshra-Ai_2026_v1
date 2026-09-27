import nodemailer from "nodemailer";

interface SendOtpMailParams {
  email: string;
  otp: string;
}

export async function sendOtpEmail({ email, otp }: SendOtpMailParams): Promise<{
  delivered: boolean;
  messageId?: string;
  previewUrl?: string | false;
}> {
  const service = process.env.SMTP_SERVICE || process.env.SERVICE || "gmail";
  const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASS;
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    (user ? `"Akshra Ai" <${user}>` : "Akshra Ai <noreply@akshra.ai>");

  const isDevelopment = process.env.NODE_ENV !== "production";
  if (isDevelopment) {
    console.log(`[Akshra Ai Auth] Development OTP for ${email}: ${otp}`);
  }

  // If credentials are not configured, return dev fallback
  if (!user || !pass) {
    if (isDevelopment) {
      console.log("[Nodemailer] SMTP credentials are not configured; using the development OTP fallback.");
    }
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport({
    service,
    auth: {
      user,
      pass,
    },
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Akshra Ai Verification Code</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;border:1px solid #e4e4e7;padding:36px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <div style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#09090b;">
                      Akshra Ai
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;font-size:16px;line-height:24px;color:#27272a;text-align:center;">
                    Here is your temporary verification code:
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <div style="display:inline-block;padding:14px 28px;background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:6px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#09090b;">
                      ${otp}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;line-height:20px;color:#71717a;text-align:center;padding-bottom:24px;">
                    This code will expire in <strong>10 minutes</strong>.<br />
                    If you didn't request this code, you can safely ignore this email.
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #f4f4f5;padding-top:20px;text-align:center;font-size:11px;color:#a1a1aa;">
                    Akshra Ai • Built with Next.js, Tailwind CSS & TypeScript
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: `Your Akshra Ai Verification Code: ${otp}`,
      text: `Your Akshra Ai verification code is: ${otp}. It will expire in 10 minutes.`,
      html,
    });

    console.log(`[Nodemailer] Verification email dispatched. ID: ${info.messageId}`);
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Nodemailer] Failed to send email via SMTP:", error);
    return { delivered: false };
  }
}
