import { prisma } from "@/lib/prisma";

export async function getGrades() {
  const grades = await prisma.grade.findMany({
    include: {
      subject: {
        select: {
          name: true,
          credits: true,
        },
      },
    },
    orderBy: { gradedAt: "desc" },
  });

  const data = grades.map((item) => ({
    id: item.id,
    subject: item.subject.name,
    score: item.score,
    credits: item.subject.credits,
    semester: "Spring 2026",
  }));

  return { data, source: "database" as const };
}
