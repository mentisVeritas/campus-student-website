import { jwtVerify, SignJWT } from "jose";

export const AUTH_COOKIE_NAME = "csw_session_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "CANTEEN_STAFF";

const jwtSecret = process.env.JWT_SECRET ?? "dev-insecure-jwt-secret-change-me";
const jwtSecretBytes = new TextEncoder().encode(jwtSecret);

export type SessionPayload = {
  userId: string;
  role: UserRole;
  mustChangePass: boolean;
};

export function isUniversityEmail(email: string): boolean {
  return email.endsWith(".edu") || email.endsWith("@university.edu");
}

export function isStrongPassword(password: string): boolean {
  return /^(?=.*\d).{8,}$/.test(password);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecretBytes);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, jwtSecretBytes, { algorithms: ["HS256"] });
    const payload = verified.payload as Partial<SessionPayload>;
    if (!payload.userId || !payload.role || typeof payload.mustChangePass !== "boolean") {
      return null;
    }
    return {
      userId: payload.userId,
      role: payload.role,
      mustChangePass: payload.mustChangePass,
    };
  } catch {
    return null;
  }
}
