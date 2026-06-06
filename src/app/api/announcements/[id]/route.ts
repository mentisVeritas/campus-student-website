import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).max(160),
  content: z.string().min(1).max(5000),
  isPinned: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);
  const { id } = await context.params;

  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!existing) return fail("Announcement not found", 404);
  if (session.role !== "ADMIN" && existing.authorId !== session.userId) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isPinned: parsed.data.isPinned ?? false,
    },
    include: {
      author: { select: { firstName: true, lastName: true, role: true } },
    },
  });
  return ok(updated);
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);
  const { id } = await context.params;

  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!existing) return fail("Announcement not found", 404);
  if (session.role !== "ADMIN" && existing.authorId !== session.userId) {
    return fail("Forbidden", 403);
  }

  await prisma.announcement.delete({ where: { id } });
  return ok({ deleted: true });
}
