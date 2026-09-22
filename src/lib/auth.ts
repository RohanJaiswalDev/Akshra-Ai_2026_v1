import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "akshra-ai-super-secret-jwt-key-2026";
export const COOKIE_NAME = "akshra_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string;
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Creates a persistent, HttpOnly session cookie. Calling this again renews the
 * session, so an active user stays signed in until they explicitly log out.
 */
export async function createSessionCookie(session: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}
