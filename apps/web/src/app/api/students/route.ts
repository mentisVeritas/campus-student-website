import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN", "TEACHER"])) {
    return fail("Forbidden", 403);
  }

  const students = await prisma.student.findMany({
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      class: { select: { name: true, year: true } },
    },
    orderBy: { studentCode: "asc" },
  });

  return ok(
    students.map((student) => ({
      id: student.id,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      studentCode: student.studentCode,
      className: student.class?.name ?? null,
      year: student.year,
    })),
  );
}
