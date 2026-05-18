import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  mode: z.enum(["UNBLOCK", "PERMANENT", "TEMPORARY"]),
  hours: z.number().int().min(1).max(24 * 365).optional(),
  reason: z.string().max(300).optional().nullable(),
});

export async function POST(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);

  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  if (!actor) return fail("Unauthorized", 401);

  const { id } = await context.params;
  if (id === session.userId) return fail("You cannot block your own account", 400);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return fail("User not found", 404);
  if (target.role === "ADMIN" && !actor.isSuperAdmin) {
    return fail("Only super admin can block admins", 403);
  }

  if (parsed.data.mode === "UNBLOCK") {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        blockedUntil: null,
        blockReason: null,
      },
      select: { id: true, isActive: true, blockedUntil: true, blockReason: true },
    });
    return ok(updated);
  }

  if (parsed.data.mode === "PERMANENT") {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        blockedUntil: null,
        blockReason: parsed.data.reason ?? null,
      },
      select: { id: true, isActive: true, blockedUntil: true, blockReason: true },
    });
    return ok(updated);
  }

  const hours = parsed.data.hours ?? 24;
  const blockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive: true,
      blockedUntil,
      blockReason: parsed.data.reason ?? null,
    },
    select: { id: true, isActive: true, blockedUntil: true, blockReason: true },
  });
  return ok(updated);
}
