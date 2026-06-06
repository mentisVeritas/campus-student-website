import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemLockState } from "@/lib/system-lock";
import { isUserBlocked } from "@/lib/user-block";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export async function requireCurrentUser() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      mustChangePass: true,
      phone: true,
      isActive: true,
      blockedUntil: true,
    },
  });

  if (!user || isUserBlocked(user)) {
    redirect("/auth/login");
  }
  const system = await getSystemLockState();
  if (system.locked && user.role !== "ADMIN") {
    redirect("/system-blocked");
  }

  return { session, user };
}
