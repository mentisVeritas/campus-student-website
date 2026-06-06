import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return fail("Unauthorized", 401);
  }

  let studentId: string | null = null;
  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    studentId = student?.id ?? null;
  }

  const events = await prisma.event.findMany({
    include: { registrations: { select: { id: true, studentId: true } } },
    orderBy: { startDate: "asc" },
  });

  return ok(
    events.map((event) => ({
      ...event,
      registrationsCount: event.registrations.length,
      isRegistered: studentId
        ? event.registrations.some((item) => item.studentId === studentId)
        : false,
    })),
  );
}
