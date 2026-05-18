import { NextRequest } from "next/server";
import { GradeType, NotificationType } from "@prisma/client";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const createGradeSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  score: z.number().int().min(0).max(100),
  type: z.enum(["QUIZ", "MIDTERM", "FINAL", "ASSIGNMENT"]),
  comment: z.string().max(500).optional(),
});

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
  if (!session || !hasRole(session, ["ADMIN", "TEACHER", "STUDENT"])) {
    return fail("Forbidden", 403);
  }

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!student) {
      return fail("Student profile not found", 404);
    }

    const grades = await prisma.grade.findMany({
      where: { studentId: student.id },
      include: { subject: { select: { name: true, credits: true } } },
      orderBy: { gradedAt: "desc" },
    });
    const deduped = dedupeLatest(grades, (item) => `${item.studentId}__${item.subjectId}__${item.type}`);
    return ok(
      deduped.map((item) => ({
        id: item.id,
        subject: item.subject.name,
        score: item.score,
        credits: item.subject.credits,
        type: item.type,
        gradedAt: item.gradedAt,
      })),
    );
  }

  if (session.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true, classes: { select: { classId: true } } },
    });
    if (!teacher) {
      return fail("Teacher profile not found", 404);
    }

    const classId = request.nextUrl.searchParams.get("classId");
    const subjectId = request.nextUrl.searchParams.get("subjectId");
    const assignedClassIds = teacher.classes.map((item) => item.classId);
    if (classId && !assignedClassIds.includes(classId)) {
      return fail("Class not assigned to teacher", 403);
    }

    const students = await prisma.student.findMany({
      where: {
        classId: classId ? classId : { in: assignedClassIds },
      },
      select: { id: true, classId: true },
    });
    const studentIds = students.map((item) => item.id);

    const grades = await prisma.grade.findMany({
      where: {
        teacherId: teacher.id,
        studentId: { in: studentIds.length ? studentIds : ["__none__"] },
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: { select: { id: true, name: true, credits: true } },
      },
      orderBy: { gradedAt: "desc" },
    });
    const deduped = dedupeLatest(grades, (item) => `${item.studentId}__${item.subjectId}__${item.type}`);
    return ok(
      deduped.map((item) => ({
        id: item.id,
        studentId: item.studentId,
        studentName: `${item.student.user.firstName} ${item.student.user.lastName}`,
        classId: students.find((row) => row.id === item.studentId)?.classId ?? null,
        subjectId: item.subject.id,
        subject: item.subject.name,
        score: item.score,
        credits: item.subject.credits,
        type: item.type,
        comment: item.comment,
        gradedAt: item.gradedAt,
      })),
    );
  }

  const grades = await prisma.grade.findMany({
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      subject: { select: { name: true, credits: true } },
    },
    orderBy: { gradedAt: "desc" },
    take: 200,
  });

  const deduped = dedupeLatest(grades, (item) => `${item.studentId}__${item.subjectId}__${item.type}`);
  return ok(
    deduped.map((item) => ({
      id: item.id,
      studentName: `${item.student.user.firstName} ${item.student.user.lastName}`,
      subject: item.subject.name,
      score: item.score,
      credits: item.subject.credits,
      type: item.type,
      gradedAt: item.gradedAt,
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER", "ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createGradeSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  let teacherId: string | null = null;
  if (session.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: {
        id: true,
        classes: { select: { classId: true } },
        subjects: { select: { subjectId: true } },
      },
    });
    if (!teacher) {
      return fail("Teacher profile not found", 404);
    }
    teacherId = teacher.id;
    const allowedSubject = teacher.subjects.some((item) => item.subjectId === parsed.data.subjectId);
    if (!allowedSubject) {
      return fail("You can grade only your own subjects", 403);
    }

    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: { classId: true },
    });
    if (!student?.classId) {
      return fail("Student class not found", 400);
    }
    const allowedClass = teacher.classes.some((item) => item.classId === student.classId);
    if (!allowedClass) {
      return fail("You cannot grade students outside your classes", 403);
    }
    const classHasSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: student.classId,
          subjectId: parsed.data.subjectId,
        },
      },
      select: { classId: true },
    });
    if (!classHasSubject) {
      return fail("Selected subject is not in student's class curriculum", 400);
    }
  } else {
    const subjectTeacher = await prisma.subject.findUnique({
      where: { id: parsed.data.subjectId },
      select: { teachers: { take: 1, select: { teacherId: true } } },
    });
    teacherId = subjectTeacher?.teachers[0]?.teacherId ?? null;
  }

  if (!teacherId) {
    return fail("Teacher assignment for grade is not defined", 400);
  }

  const existing = await prisma.grade.findFirst({
    where: {
      studentId: parsed.data.studentId,
      subjectId: parsed.data.subjectId,
      type: parsed.data.type,
    },
    orderBy: [{ gradedAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  const saved = existing
    ? await prisma.grade.update({
        where: { id: existing.id },
        data: {
          teacherId,
          score: parsed.data.score,
          comment: parsed.data.comment,
        },
      })
    : await prisma.grade.create({
        data: {
          studentId: parsed.data.studentId,
          subjectId: parsed.data.subjectId,
          teacherId,
          score: parsed.data.score,
          type: parsed.data.type,
          comment: parsed.data.comment,
        },
      });

  const studentWithParents = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (studentWithParents) {
    await createNotification(
      studentWithParents.userId,
      NotificationType.NEW_GRADE,
      "New grade added",
      `New ${parsed.data.type} grade: ${parsed.data.score}`,
      "/dashboard/student/grades",
    );
  }

  const studentGpaRows = await prisma.grade.findMany({
    where: { studentId: parsed.data.studentId },
    include: { subject: { select: { credits: true } } },
  });
  const weightedSum = studentGpaRows.reduce((sum, row) => sum + row.score * row.subject.credits, 0);
  const creditsSum = studentGpaRows.reduce((sum, row) => sum + row.subject.credits, 0);
  const gpa = creditsSum ? weightedSum / creditsSum / 20 : 0;
  if (gpa < 2 && studentWithParents) {
    await createNotification(
      studentWithParents.userId,
      NotificationType.ACADEMIC_DEBT,
      "Academic debt warning",
      "Your GPA dropped below 2.0. Please contact your advisor.",
      "/dashboard/student/grades",
    );
  }

  return ok(saved, existing ? 200 : 201);
}
