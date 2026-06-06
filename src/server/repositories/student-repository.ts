import { prisma } from "@/lib/prisma";

export async function getStudents() {
  const data = await prisma.student.findMany({
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      class: { select: { name: true } },
    },
    orderBy: { studentCode: "asc" },
  });

  return {
    data: data.map((row) => ({
      id: row.id,
      fullName: `${row.user.firstName} ${row.user.lastName}`,
      email: row.user.email,
      group: row.class?.name ?? "N/A",
      specialty: "Computer Science",
      faculty: "Engineering",
      year: row.year,
    })),
    source: "database" as const,
  };
}
