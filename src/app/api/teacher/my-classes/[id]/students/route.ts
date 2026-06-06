import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) {
    return fail("Forbidden", 403);
  }
  const { id: classId } = await context.params;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) {
    return fail("Teacher profile not found", 404);
  }

  const relation = await prisma.classTeacher.findUnique({
    where: {
      classId_teacherId: {
        classId,
        teacherId: teacher.id,
      },
    },
    select: { classId: true },
  });
  if (!relation) {
    return fail("Class not assigned to teacher", 403);
  }

  const students = await prisma.student.findMany({
    where: { classId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { studentCode: "asc" },
  });

  return ok(
    students.map((student) => ({
      id: student.id,
      studentCode: student.studentCode,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      year: student.year,
    })),
  );
}
