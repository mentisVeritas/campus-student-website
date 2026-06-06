import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { assertTeacherClassAccess, assertTeacherSubjectAccess, ForbiddenError } from "@/lib/teacher-access";

function escapeCsv(value: string) {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

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
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  const grades = await prisma.grade.findMany({
    where: {
      subjectId,
      studentId: { in: studentIds.length ? studentIds : ["__none__"] },
      ...(teacherId ? { teacherId } : {}),
    },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      subject: { select: { code: true, name: true } },
    },
    orderBy: [{ gradedAt: "asc" }],
  });

  const lines = [
    ["Student", "Type", "Score", "Date", "Comment"].join(","),
    ...grades.map((g) =>
      [
        escapeCsv(`${g.student.user.firstName} ${g.student.user.lastName}`),
        g.type,
        g.score.toString(),
        g.gradedAt.toISOString().slice(0, 10),
        escapeCsv(g.comment ?? ""),
      ].join(","),
    ),
  ];

  const classRow = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  const subjectRow = await prisma.subject.findUnique({ where: { id: subjectId }, select: { code: true } });
  const filename = `grades-${(classRow?.name ?? "class").replaceAll(" ", "")}-${subjectRow?.code ?? "subject"}.csv`;

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
