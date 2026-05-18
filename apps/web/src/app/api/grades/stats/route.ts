import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { assertTeacherClassAccess, assertTeacherSubjectAccess, ForbiddenError } from "@/lib/teacher-access";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER", "ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const classId = request.nextUrl.searchParams.get("classId");
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  if (!classId || !subjectId) return fail("classId and subjectId are required", 400);

  let teacherId: string | null = null;
  if (session.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!teacher) return fail("Teacher profile not found", 404);
    teacherId = teacher.id;
    try {
      await assertTeacherClassAccess(teacher.id, classId);
      await assertTeacherSubjectAccess(teacher.id, subjectId);
    } catch (error) {
      if (error instanceof ForbiddenError) return fail(error.message, 403);
      throw error;
    }
  }

  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  });
  const studentIds = students.map((s) => s.id);

  const grades = await prisma.grade.findMany({
    where: {
      subjectId,
      studentId: { in: studentIds.length ? studentIds : ["__none__"] },
      ...(teacherId ? { teacherId } : {}),
    },
    select: { studentId: true, score: true },
  });

  const avg = grades.length ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length : 0;
  const byStudent = new Map<string, number[]>();
  for (const grade of grades) {
    const arr = byStudent.get(grade.studentId) ?? [];
    arr.push(grade.score);
    byStudent.set(grade.studentId, arr);
  }
  const ranked = students
    .map((s) => {
      const scores = byStudent.get(s.id) ?? [];
      const studentAvg = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      return {
        studentId: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        average: studentAvg,
      };
    })
    .sort((a, b) => b.average - a.average);

  const topStudent = ranked[0] ?? null;
  const below65 = ranked.filter((item) => item.average < 65);

  return ok({
    averageScore: Number(avg.toFixed(2)),
    topStudent,
    below65,
    totalGrades: grades.length,
    studentsCount: students.length,
  });
}
