import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().max(30).optional(),
  year: z.number().int().min(1).max(6).optional(),
  studentClassId: z.string().nullable().optional(),
  department: z.string().min(1).max(100).optional(),
  teacherSubjectIds: z.array(z.string().min(1)).optional(),
  teacherClassIds: z.array(z.string().min(1)).optional(),
  homeroomClassId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isSuperAdmin: true,
      createdAt: true,
      mustChangePass: true,
      isActive: true,
      blockedUntil: true,
      blockReason: true,
    },
  });
  return ok(users);
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  if (!actor) return fail("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }
  if (parsed.data.role === "ADMIN" && !actor.isSuperAdmin) {
    return fail("Only super admin can create admins", 403);
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (exists) {
    return fail("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
        isSuperAdmin: false,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
    });

    if (parsed.data.role === "STUDENT") {
      const studentCode = `STU-${Date.now().toString().slice(-6)}`;
      await tx.student.create({
        data: {
          userId: created.id,
          studentCode,
          year: parsed.data.year ?? 1,
          classId: parsed.data.studentClassId ?? null,
        },
      });
    }

    if (parsed.data.role === "TEACHER") {
      const employeeId = `TCH-${Date.now().toString().slice(-6)}`;
      const createdTeacher = await tx.teacher.create({
        data: {
          userId: created.id,
          employeeId,
          department: parsed.data.department ?? "General",
        },
      });
      if (parsed.data.teacherSubjectIds?.length) {
        await tx.teacherSubject.createMany({
          data: parsed.data.teacherSubjectIds.map((subjectId) => ({
            teacherId: createdTeacher.id,
            subjectId,
          })),
          skipDuplicates: true,
        });
      }
      if (parsed.data.teacherClassIds?.length) {
        await tx.classTeacher.createMany({
          data: parsed.data.teacherClassIds.map((classId) => ({
            classId,
            teacherId: createdTeacher.id,
            isHomeroom: parsed.data.homeroomClassId === classId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return created;
  });

  return ok(user, 201);
}
