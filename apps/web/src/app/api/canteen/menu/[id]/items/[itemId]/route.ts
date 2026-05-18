import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string; itemId: string }>;
};

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().nonnegative().optional(),
  available: z.boolean().optional(),
  calories: z.number().int().positive().nullable().optional(),
});

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["CANTEEN_STAFF", "ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { itemId } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  const updated = await prisma.canteenItem.update({
    where: { id: itemId },
    data: parsed.data,
  });
  return ok(updated);
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["CANTEEN_STAFF", "ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { itemId } = await context.params;

  await prisma.canteenItem.delete({ where: { id: itemId } });
  return ok({ deleted: true });
}
