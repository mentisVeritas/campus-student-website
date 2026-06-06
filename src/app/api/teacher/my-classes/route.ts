import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) {
    return fail("Forbidden", 403);
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) {
    return fail("Teacher profile not found", 404);
  }

  const classes = await prisma.classTeacher.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: {
        include: {
          students: { select: { id: true } },
        },
      },
    },
    orderBy: { class: { name: "asc" } },
  });

  return ok(
    classes.map((item) => ({
      id: item.class.id,
      name: item.class.name,
      year: item.class.year,
      studentsCount: item.class.students.length,
      isHomeroom: item.isHomeroom,
    })),
  );
}
