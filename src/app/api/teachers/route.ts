import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const teachers = await prisma.teacher.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      subjects: { include: { subject: { select: { name: true } } } },
    },
    orderBy: { employeeId: "asc" },
  });

  return ok(
    teachers.map((teacher) => ({
      id: teacher.id,
      name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      email: teacher.user.email,
      department: teacher.department,
      subjects: teacher.subjects.map((item) => item.subject.name),
    })),
  );
}
