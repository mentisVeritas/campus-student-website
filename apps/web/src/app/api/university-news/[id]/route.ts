import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const updateNewsSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().min(1).max(80),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "ADMIN") return fail("Forbidden", 403);

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateNewsSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const exists = await prisma.universityNews.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("News not found", 404);

  const updated = await prisma.universityNews.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
    },
  });
  return ok(updated);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "ADMIN") return fail("Forbidden", 403);

  const { id } = await context.params;
  const exists = await prisma.universityNews.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("News not found", 404);

  await prisma.universityNews.delete({ where: { id } });
  return ok({ deleted: true });
}
