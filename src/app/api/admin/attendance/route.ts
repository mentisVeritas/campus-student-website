import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);

  const classId = request.nextUrl.searchParams.get("classId");
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  const studentId = request.nextUrl.searchParams.get("studentId");
  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");

  const rows = await prisma.attendance.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const summary = Object.values(
    rows.reduce<
      Record<
        string,
        {
          studentId: string;
          studentName: string;
          className: string;
          subjectName: string;
          total: number;
          present: number;
          absent: number;
          late: number;
        }
      >
    >((acc, row) => {
      const key = `${row.studentId}-${row.subjectId}`;
      if (!acc[key]) {
        acc[key] = {
          studentId: row.studentId,
          studentName: `${row.student.user.firstName} ${row.student.user.lastName}`,
          className: row.class.name,
          subjectName: row.subject.name,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        };
      }
      acc[key].total += 1;
      if (row.status === "PRESENT") acc[key].present += 1;
      if (row.status === "ABSENT") acc[key].absent += 1;
      if (row.status === "LATE") acc[key].late += 1;
      return acc;
    }, {}),
  ).map((entry) => ({
    ...entry,
    attendanceRate: entry.total ? Number(((entry.present + entry.late * 0.5) / entry.total * 100).toFixed(1)) : 0,
  }));

  return ok(summary);
}
