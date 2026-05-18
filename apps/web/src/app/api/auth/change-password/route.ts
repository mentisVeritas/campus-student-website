import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { isStrongPassword, signSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return fail("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  if (!isStrongPassword(parsed.data.newPassword)) {
    return fail("New password must be at least 8 chars and include a number", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true, role: true },
  });
  if (!user) {
    return fail("User not found", 404);
  }

  const isCurrentValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return fail("Current password is incorrect", 400);
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePass: false },
  });

  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    mustChangePass: false,
  });

  const response = ok({ changed: true });
  response.cookies.set("csw_session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
