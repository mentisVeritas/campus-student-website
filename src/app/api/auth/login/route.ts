import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, isUniversityEmail, signSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemLockState } from "@/lib/system-lock";
import { isUserBlocked } from "@/lib/user-block";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const roleHome = {
  ADMIN: "/dashboard/admin",
  TEACHER: "/dashboard/teacher",
  STUDENT: "/dashboard/student",
  CANTEEN_STAFF: "/dashboard/canteen",
} as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  if (!z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!isUniversityEmail(email)) {
    return NextResponse.json(
      { error: "Use university email ending with .edu" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      isActive: true,
      blockedUntil: true,
      mustChangePass: true,
    },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (isUserBlocked(user)) {
    return NextResponse.json({ error: "Account is blocked." }, { status: 401 });
  }
  const system = await getSystemLockState();
  if (system.locked && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: system.reason ? `System is blocked: ${system.reason}` : "System is blocked. Please contact administrator." },
      { status: 423 },
    );
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    mustChangePass: user.mustChangePass,
  });

  const response = NextResponse.json({ data: { redirectTo: roleHome[user.role] } });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
