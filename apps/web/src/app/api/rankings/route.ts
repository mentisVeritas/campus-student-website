import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return fail("Unauthorized", 401);
  }

  const rankings = await prisma.academicRanking.findMany({
    orderBy: [{ rank: "asc" }],
    take: 10,
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          class: { select: { name: true } },
        },
      },
    },
  });

  return ok(
    rankings.map((row) => ({
      id: row.id,
      rank: row.rank,
      gpa: row.gpa,
      semester: row.semester,
      studentId: row.studentId,
      studentName: `${row.student.user.firstName} ${row.student.user.lastName}`,
      className: row.student.class?.name ?? "N/A",
      isCurrentUser: row.student.userId === session.userId,
    })),
  );
}
