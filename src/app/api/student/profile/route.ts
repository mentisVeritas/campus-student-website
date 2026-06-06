import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(30).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["STUDENT"])) {
    return fail("Forbidden", 403);
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
      class: { select: { name: true, year: true } },
    },
  });

  if (!student) {
    return fail("Student profile not found", 404);
  }

  return ok({
    firstName: student.user.firstName,
    lastName: student.user.lastName,
    email: student.user.email,
    phone: student.user.phone,
    studentCode: student.studentCode,
    class: student.class?.name ?? null,
    year: student.year,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["STUDENT"])) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid body", 400);
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: parsed.data,
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  });

  return ok(updated);
}
