import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const students = await prisma.student.findMany({
    select: { id: true },
  });

  for (const student of students) {
    const grades = await prisma.grade.findMany({
      where: { studentId: student.id },
      select: { score: true },
    });
    const gpa = grades.length
      ? Number((grades.reduce((sum, item) => sum + item.score, 0) / grades.length / 20).toFixed(2))
      : 0;

    await prisma.academicRanking.upsert({
      where: { studentId: student.id },
      update: { gpa, semester: "Spring 2026" },
      create: { studentId: student.id, gpa, rank: 0, semester: "Spring 2026" },
    });
  }

  const rows = await prisma.academicRanking.findMany({ orderBy: { gpa: "desc" } });
  await Promise.all(
    rows.map((row, index) =>
      prisma.academicRanking.update({
        where: { id: row.id },
        data: { rank: index + 1 },
      }),
    ),
  );

  return ok({ refreshed: true, total: rows.length });
}
