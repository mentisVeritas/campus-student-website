import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  year: z.number().int().min(1).max(10).optional(),
});

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  const updated = await prisma.class.update({
    where: { id },
    data: parsed.data,
  });
  return ok(updated);
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { id } = await context.params;

  await prisma.class.delete({ where: { id } });
  return ok({ deleted: true });
}
