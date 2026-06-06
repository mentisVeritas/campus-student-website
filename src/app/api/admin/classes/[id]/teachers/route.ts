import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  teacherId: z.string().min(1),
  isHomeroom: z.boolean().optional(),
});

export async function POST(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { id: classId } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  if (parsed.data.isHomeroom) {
    await prisma.classTeacher.updateMany({
      where: { classId, isHomeroom: true },
      data: { isHomeroom: false },
    });
  }

  const created = await prisma.classTeacher.upsert({
    where: {
      classId_teacherId: {
        classId,
        teacherId: parsed.data.teacherId,
      },
    },
    update: { isHomeroom: parsed.data.isHomeroom ?? false },
    create: {
      classId,
      teacherId: parsed.data.teacherId,
      isHomeroom: parsed.data.isHomeroom ?? false,
    },
  });
  return ok(created, 201);
}
