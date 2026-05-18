import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

function dedupeLatest<T>(rows: T[], getKey: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["STUDENT"])) {
    return fail("Forbidden", 403);
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true, classId: true },
  });
  if (!student) {
    return fail("Student profile not found", 404);
  }
  if (!student.classId) {
    return ok({ gpa: 0, subjects: [], semester: "Spring 2026" });
  }

  const classSubjects = await prisma.classSubject.findMany({
    where: { classId: student.classId },
    select: { subjectId: true },
  });
  const allowedSubjectIds = classSubjects.map((item) => item.subjectId);
  if (!allowedSubjectIds.length) {
    return ok({ gpa: 0, subjects: [], semester: "Spring 2026" });
  }

  const grades = await prisma.grade.findMany({
    where: { studentId: student.id, subjectId: { in: allowedSubjectIds } },
    include: {
      subject: { select: { name: true, code: true, credits: true } },
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { gradedAt: "desc" },
  });
  const dedupedGrades = dedupeLatest(grades, (item) => `${item.studentId}__${item.subjectId}__${item.type}`);

  const grouped = Object.values(
    dedupedGrades.reduce<Record<string, { subject: string; code: string; credits: number; items: typeof dedupedGrades }>>(
      (acc, grade) => {
        if (!acc[grade.subjectId]) {
          acc[grade.subjectId] = {
            subject: grade.subject.name,
            code: grade.subject.code,
            credits: grade.subject.credits,
            items: [],
          };
        }
        acc[grade.subjectId].items.push(grade);
        return acc;
      },
      {},
    ),
  ).map((group) => {
    const average = group.items.length
      ? Number((group.items.reduce((sum, item) => sum + item.score, 0) / group.items.length).toFixed(2))
      : 0;
    return {
      subject: group.subject,
      code: group.code,
      credits: group.credits,
      average,
      items: group.items.map((grade) => ({
        id: grade.id,
        score: grade.score,
        type: grade.type,
        comment: grade.comment,
        gradedAt: grade.gradedAt,
        teacherName: `${grade.teacher.user.firstName} ${grade.teacher.user.lastName}`,
      })),
    };
  });

  const gpa = grouped.length
    ? Number((grouped.reduce((sum, item) => sum + item.average, 0) / grouped.length / 20).toFixed(2))
    : 0;

  return ok({ gpa, subjects: grouped, semester: "Spring 2026" });
}
