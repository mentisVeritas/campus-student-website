import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(40),
  year: z.number().int().min(1).max(10),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const classes = await prisma.class.findMany({
    include: {
      students: { select: { id: true } },
      teachers: {
        where: { isHomeroom: true },
        include: {
          teacher: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
    orderBy: [{ year: "asc" }, { name: "asc" }],
  });

  return ok(
    classes.map((item) => ({
      id: item.id,
      name: item.name,
      year: item.year,
      studentsCount: item.students.length,
      homeroomTeacher: item.teachers[0]
        ? `${item.teachers[0].teacher.user.firstName} ${item.teachers[0].teacher.user.lastName}`
        : null,
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  const created = await prisma.class.create({
    data: {
      name: parsed.data.name,
      year: parsed.data.year,
    },
  });

  return ok(created, 201);
}
