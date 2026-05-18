import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { isStrongPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  temporaryPassword: z.string().min(8),
});

export async function POST(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  if (!actor) return fail("Unauthorized", 401);
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }
  if (!isStrongPassword(parsed.data.temporaryPassword)) {
    return fail("Temporary password must include at least one number", 400);
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return fail("User not found", 404);
  if (target.role === "ADMIN" && !actor.isSuperAdmin) {
    return fail("Only super admin can reset admin passwords", 403);
  }

  const hash = await bcrypt.hash(parsed.data.temporaryPassword, 12);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: hash,
      mustChangePass: true,
    },
  });

  return ok({ reset: true });
}
