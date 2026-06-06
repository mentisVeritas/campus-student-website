import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string; teacherId: string }>;
};

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const { id: classId, teacherId } = await context.params;
  const existing = await prisma.classTeacher.findUnique({
    where: { classId_teacherId: { classId, teacherId } },
    select: { classId: true, teacherId: true },
  });
  if (!existing) return fail("Teacher assignment not found", 404);

  await prisma.classTeacher.delete({
    where: { classId_teacherId: { classId, teacherId } },
  });
  return ok({ removed: true });
}
