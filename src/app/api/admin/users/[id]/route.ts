import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(30).nullable().optional(),
  studentYear: z.number().int().min(1).max(6).nullable().optional(),
  studentClassId: z.string().nullable().optional(),
  teacherDepartment: z.string().min(1).max(100).nullable().optional(),
  teacherSubjectIds: z.array(z.string().min(1)).optional(),
  teacherClassIds: z.array(z.string().min(1)).optional(),
  homeroomClassId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  blockedUntil: z.string().datetime().nullable().optional(),
  blockReason: z.string().max(300).nullable().optional(),
});

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  if (!actor) return fail("Unauthorized", 401);
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isSuperAdmin: true, email: true },
  });
  if (!target) return fail("User not found", 404);
  if (!actor.isSuperAdmin) {
    if (parsed.data.role === "ADMIN") {
      return fail("Only super admin can assign admin role", 403);
    }
    if (target.role === "ADMIN") {
      return fail("Only super admin can edit admins", 403);
    }
  }
  if (typeof parsed.data.isActive !== "undefined" && target.role === "ADMIN" && !actor.isSuperAdmin) {
    return fail("Only super admin can block admins", 403);
  }
  if (parsed.data.email && parsed.data.email !== target.email) {
    const exists = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (exists) return fail("Email already exists", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        email: parsed.data.email,
        role: parsed.data.role,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        isActive: parsed.data.isActive,
        blockedUntil:
          typeof parsed.data.blockedUntil === "string"
            ? new Date(parsed.data.blockedUntil)
            : parsed.data.blockedUntil,
        blockReason: parsed.data.blockReason,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        firstName: true,
        lastName: true,
        phone: true,
        mustChangePass: true,
        isActive: true,
        blockedUntil: true,
        blockReason: true,
      },
    });

    const nextRole = parsed.data.role ?? target.role;
    if (nextRole === "STUDENT" || parsed.data.studentYear !== undefined || parsed.data.studentClassId !== undefined) {
      const existing = await tx.student.findUnique({ where: { userId: id }, select: { id: true, studentCode: true } });
      if (existing) {
        await tx.student.update({
          where: { userId: id },
          data: {
            ...(parsed.data.studentYear !== undefined ? { year: parsed.data.studentYear ?? 1 } : {}),
            ...(parsed.data.studentClassId !== undefined ? { classId: parsed.data.studentClassId } : {}),
          },
        });
      } else if (nextRole === "STUDENT") {
        const studentCode = `STU-${Date.now().toString().slice(-6)}`;
        await tx.student.create({
          data: {
            userId: id,
            studentCode,
            year: parsed.data.studentYear ?? 1,
            classId: parsed.data.studentClassId ?? null,
          },
        });
      }
    }

    if (
      nextRole === "TEACHER" ||
      parsed.data.teacherDepartment !== undefined ||
      parsed.data.teacherSubjectIds !== undefined ||
      parsed.data.teacherClassIds !== undefined ||
      parsed.data.homeroomClassId !== undefined
    ) {
      const existing = await tx.teacher.findUnique({ where: { userId: id }, select: { id: true } });
      if (existing) {
        if (parsed.data.teacherDepartment !== undefined) {
          await tx.teacher.update({
            where: { userId: id },
            data: { department: parsed.data.teacherDepartment ?? "General" },
          });
        }
        if (parsed.data.teacherSubjectIds !== undefined) {
          await tx.teacherSubject.deleteMany({ where: { teacherId: existing.id } });
          if (parsed.data.teacherSubjectIds.length) {
            await tx.teacherSubject.createMany({
              data: parsed.data.teacherSubjectIds.map((subjectId) => ({
                teacherId: existing.id,
                subjectId,
              })),
              skipDuplicates: true,
            });
          }
        }
        if (parsed.data.teacherClassIds !== undefined) {
          await tx.classTeacher.deleteMany({ where: { teacherId: existing.id } });
          if (parsed.data.teacherClassIds.length) {
            await tx.classTeacher.createMany({
              data: parsed.data.teacherClassIds.map((classId) => ({
                classId,
                teacherId: existing.id,
                isHomeroom: false,
              })),
              skipDuplicates: true,
            });
          }
          if (parsed.data.homeroomClassId) {
            await tx.classTeacher.upsert({
              where: {
                classId_teacherId: {
                  classId: parsed.data.homeroomClassId,
                  teacherId: existing.id,
                },
              },
              update: { isHomeroom: true },
              create: {
                classId: parsed.data.homeroomClassId,
                teacherId: existing.id,
                isHomeroom: true,
              },
            });
          }
        } else if (parsed.data.homeroomClassId !== undefined) {
          await tx.classTeacher.updateMany({
            where: { teacherId: existing.id, isHomeroom: true },
            data: { isHomeroom: false },
          });
          if (parsed.data.homeroomClassId) {
            await tx.classTeacher.upsert({
              where: {
                classId_teacherId: {
                  classId: parsed.data.homeroomClassId,
                  teacherId: existing.id,
                },
              },
              update: { isHomeroom: true },
              create: {
                classId: parsed.data.homeroomClassId,
                teacherId: existing.id,
                isHomeroom: true,
              },
            });
          }
        }
      } else if (nextRole === "TEACHER") {
        const employeeId = `TCH-${Date.now().toString().slice(-6)}`;
        const createdTeacher = await tx.teacher.create({
          data: {
            userId: id,
            employeeId,
            department: parsed.data.teacherDepartment ?? "General",
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
    }

    return user;
  });
  return ok(updated);
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  if (!actor) return fail("Unauthorized", 401);
  const { id } = await context.params;

  if (id === session.userId) {
    return fail("You cannot delete your own account", 400);
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return fail("User not found", 404);
  if (target.role === "ADMIN" && !actor.isSuperAdmin) {
    return fail("Only super admin can delete admins", 403);
  }

  await prisma.user.delete({ where: { id } });
  return ok({ deleted: true });
}
