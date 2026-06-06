import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string; sid: string }>;
};

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await getApiSession(request);
    if (!session || !hasRole(session, ["ADMIN"])) {
      return fail("Forbidden", 403);
    }
    const { id: classId, sid } = await context.params;

    const inClass = await prisma.student.findFirst({
      where: { id: sid, classId },
      select: { id: true },
    });
    if (!inClass) {
      return fail("Student not found in this class", 404);
    }

    const updated = await prisma.student.update({
      where: { id: sid },
      data: { classId: null },
      select: { id: true, classId: true },
    });
    return ok(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("Student not found", 404);
    }
    console.error("[DELETE /admin/classes/.../students/...]", error);
    return fail("Failed to remove student from class", 500);
  }
}
