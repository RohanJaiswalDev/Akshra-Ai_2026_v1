import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const COOKIE_NAME = "akshra_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string;
}

function getJwtSecret() {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV !== "production") return "akshra-ai-development-session-secret";
  throw new Error("JWT_SECRET must be configured in production.");
}

export function signSessionToken(payload: SessionPayload): string {
  // Strip any existing JWT claims (iat, exp, etc.) from previously decoded tokens
  // to avoid jsonwebtoken throwing "Bad options.expiresIn option the payload already has an exp property"
  const cleanPayload: SessionPayload = {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
  };

  return jwt.sign(cleanPayload, getJwtSecret(), {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload;
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
 * Sets both maxAge and an explicit expires Date to ensure persistence across
 * browser reloads, window closures, and process exits.
 */
export async function createSessionCookie(session: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  cookieStore.set(COOKIE_NAME, signSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires,
    path: "/",
  });
}
