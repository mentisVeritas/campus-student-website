import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  let studentId: string | null = null;
  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    studentId = student?.id ?? null;
  }

  const sections = await prisma.sportsSection.findMany({
    include: { registrations: { select: { studentId: true } } },
    orderBy: { name: "asc" },
  });

  return ok(
    sections.map((section) => ({
      id: section.id,
      name: section.name,
      coach: section.coach,
      description: section.description,
      schedule: section.schedule,
      location: section.location,
      maxMembers: section.maxMembers,
      registrationsCount: section.registrations.length,
      isRegistered: studentId
        ? section.registrations.some((item) => item.studentId === studentId)
        : false,
    })),
  );
}
