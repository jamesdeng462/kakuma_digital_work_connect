// Authentication: bcrypt password hashes + a signed JWT in an httpOnly cookie.
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";

const COOKIE = "kdwc_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.JWT_SECRET || createHash("sha256").update("kdwc:" + (process.env.DATABASE_URL ?? "local-dev")).digest("hex");
  return new TextEncoder().encode(s);
}

export async function createSessionCookie(userId: string, role: string) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const secure = process.env.NODE_ENV === "production" && !process.env.KDWC_INSECURE_COOKIES ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function readSession(req: Request): Promise<string | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
