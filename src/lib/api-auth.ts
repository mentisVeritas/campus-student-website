import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, type UserRole, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemLockState } from "@/lib/system-lock";
import { isUserBlocked } from "@/lib/user-block";

export type ApiSession = {
  userId: string;
  role: UserRole;
  mustChangePass: boolean;
};

export async function getApiSession(request: NextRequest): Promise<ApiSession | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, isActive: true, blockedUntil: true },
  });
  if (!user || isUserBlocked(user)) return null;
  if (user.role !== session.role) return null;
  const system = await getSystemLockState();
  if (system.locked && user.role !== "ADMIN") return null;

  return session;
}

export function hasRole(session: ApiSession, roles: UserRole[]) {
  return roles.includes(session.role);
}
