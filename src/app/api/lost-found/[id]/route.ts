import { LostFoundStatus, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  status: z.nativeEnum(LostFoundStatus),
});

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const item = await prisma.lostFoundItem.findUnique({
    where: { id },
    select: { reportedBy: true },
  });
  if (!item) return fail("Item not found", 404);
  if (session.role !== Role.ADMIN && item.reportedBy !== session.userId) {
    return fail("Forbidden", 403);
  }

  const updated = await prisma.lostFoundItem.update({
    where: { id },
    data: {
      status: parsed.data.status,
      foundDate: parsed.data.status === "FOUND" ? new Date() : undefined,
    },
  });
  return ok(updated);
}
