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
  const { id: eventId } = await context.params;

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!student) return fail("Student profile not found", 404);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { registrations: { select: { id: true } } },
  });
  if (!event) return fail("Event not found", 404);
  if (event.maxParticipants && event.registrations.length >= event.maxParticipants) {
    return fail("No seats available", 400);
  }

  const created = await prisma.eventRegistration.upsert({
    where: {
      eventId_studentId: {
        eventId,
        studentId: student.id,
      },
    },
    update: {},
    create: {
      eventId,
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
  const { id: eventId } = await context.params;

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!student) return fail("Student profile not found", 404);

  await prisma.eventRegistration.deleteMany({
    where: { eventId, studentId: student.id },
  });

  return ok({ unregistered: true });
}
