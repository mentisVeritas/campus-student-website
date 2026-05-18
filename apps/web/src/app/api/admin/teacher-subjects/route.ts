import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const assignSchema = z.object({
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const [subjects, teachers] = await Promise.all([
    prisma.subject.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        credits: true,
        _count: { select: { teachers: true } },
      },
    }),
    prisma.teacher.findMany({
      orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }],
      select: {
        id: true,
        employeeId: true,
        user: { select: { firstName: true, lastName: true } },
        subjects: {
          orderBy: [{ subject: { name: "asc" } }],
          select: { subject: { select: { id: true, name: true, code: true } } },
        },
      },
    }),
  ]);

  return ok({
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      credits: s.credits,
      teachersCount: s._count.teachers,
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      employeeId: t.employeeId,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      subjects: t.subjects.map((link) => link.subject),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  await prisma.teacherSubject.upsert({
    where: {
      teacherId_subjectId: {
        teacherId: parsed.data.teacherId,
        subjectId: parsed.data.subjectId,
      },
    },
    update: {},
    create: {
      teacherId: parsed.data.teacherId,
      subjectId: parsed.data.subjectId,
    },
  });

  return ok({ assigned: true }, 201);
}

export async function DELETE(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  const existing = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId: parsed.data.teacherId,
        subjectId: parsed.data.subjectId,
      },
    },
    select: { teacherId: true },
  });
  if (!existing) {
    return fail("Assignment not found", 404);
  }

  await prisma.teacherSubject.delete({
    where: {
      teacherId_subjectId: {
        teacherId: parsed.data.teacherId,
        subjectId: parsed.data.subjectId,
      },
    },
  });
  return ok({ removed: true });
}
