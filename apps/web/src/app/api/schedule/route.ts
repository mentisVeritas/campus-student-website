import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN", "TEACHER", "STUDENT"])) {
    return fail("Forbidden", 403);
  }

  let classId: string | null = null;

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
      select: { classId: true },
    });
    classId = student?.classId ?? null;
  }

  const schedule = await prisma.scheduleItem.findMany({
    where: classId ? { classId } : undefined,
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return ok(
    schedule.map((item) => ({
      id: item.id,
      className: item.class.name,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room,
      changeNote: item.changeNote,
      subject: item.subject.name,
    })),
  );
}
