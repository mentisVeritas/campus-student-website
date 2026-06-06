import { AttendanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { assertTeacherClassAccess, assertTeacherSubjectAccess, ForbiddenError } from "@/lib/teacher-access";

type Context = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().max(300).optional(),
});

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) return fail("Forbidden", 403);
  const { id } = await context.params;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) return fail("Teacher profile not found", 404);

  const row = await prisma.attendance.findUnique({
    where: { id },
    select: { teacherId: true, classId: true, subjectId: true },
  });
  if (!row) return fail("Attendance record not found", 404);
  if (row.teacherId !== teacher.id) return fail("Forbidden", 403);
  try {
    await assertTeacherClassAccess(teacher.id, row.classId);
    await assertTeacherSubjectAccess(teacher.id, row.subjectId);
  } catch (error) {
    if (error instanceof ForbiddenError) return fail(error.message, 403);
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const updated = await prisma.attendance.update({
    where: { id },
    data: parsed.data,
  });
  return ok(updated);
}
