import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  studentId: z.string().min(1),
});

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await getApiSession(request);
    if (!session || !hasRole(session, ["ADMIN"])) {
      return fail("Forbidden", 403);
    }
    const { id: classId } = await context.params;

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid request body", 400);
    }

    const updated = await prisma.student.update({
      where: { id: parsed.data.studentId, classId: null },
      data: { classId },
      select: { id: true, classId: true },
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("Student not found or already assigned to a class", 404);
    }
    console.error("[POST /admin/classes/.../students]", error);
    return fail("Failed to assign student", 500);
  }
}
