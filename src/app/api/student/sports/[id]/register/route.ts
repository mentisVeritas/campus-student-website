import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["STUDENT"])) {
    return fail("Forbidden", 403);
  }
  const { id: sectionId } = await context.params;

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!student) return fail("Student profile not found", 404);

  const section = await prisma.sportsSection.findUnique({
    where: { id: sectionId },
    include: { registrations: { select: { id: true } } },
  });
  if (!section) return fail("Sports section not found", 404);
  if (section.maxMembers && section.registrations.length >= section.maxMembers) {
    return fail("Section is full", 400);
  }

  const created = await prisma.sportsRegistration.upsert({
    where: {
      sectionId_studentId: {
        sectionId,
        studentId: student.id,
      },
    },
    update: {},
    create: {
      sectionId,
      studentId: student.id,
    },
  });

  return ok(created, 201);
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["STUDENT"])) {
    return fail("Forbidden", 403);
  }
  const { id: sectionId } = await context.params;

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!student) return fail("Student profile not found", 404);

  await prisma.sportsRegistration.deleteMany({
    where: { sectionId, studentId: student.id },
  });

  return ok({ unregistered: true });
}
