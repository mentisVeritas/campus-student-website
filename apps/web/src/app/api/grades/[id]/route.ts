import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  score: z.number().int().min(0).max(100).optional(),
  comment: z.string().max(500).nullable().optional(),
  type: z.enum(["QUIZ", "MIDTERM", "FINAL", "ASSIGNMENT", "ATTENDANCE"]).optional(),
});

async function canTeacherAccessGrade(userId: string, gradeId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!teacher) return { allowed: false, teacherId: null };

  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    select: { teacherId: true },
  });
  if (!grade) return { allowed: false, teacherId: teacher.id };

  return { allowed: grade.teacherId === teacher.id, teacherId: teacher.id };
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER", "ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { id } = await context.params;

  if (session.role === "TEACHER") {
    const access = await canTeacherAccessGrade(session.userId, id);
    if (!access.allowed) {
      return fail("You can update only your own grades", 403);
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  const updated = await prisma.grade.update({
    where: { id },
    data: parsed.data,
  });

  return ok(updated);
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER", "ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { id } = await context.params;

  if (session.role === "TEACHER") {
    const access = await canTeacherAccessGrade(session.userId, id);
    if (!access.allowed) {
      return fail("You can delete only your own grades", 403);
    }
  }

  await prisma.grade.delete({ where: { id } });
  return ok({ deleted: true });
}
