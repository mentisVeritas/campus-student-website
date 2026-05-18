import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getTeacherClassIds, getTeacherSubjectIds } from "@/lib/teacher-access";
import { attendanceOverviewGet } from "@/server/attendance-overview-get";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) return fail("Forbidden", 403);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) return fail("Teacher profile not found", 404);

  const [allowedClassIds, allowedSubjectIds] = await Promise.all([
    getTeacherClassIds(teacher.id),
    getTeacherSubjectIds(teacher.id),
  ]);
  return attendanceOverviewGet(request.nextUrl.searchParams, {
    mode: "teacher",
    allowedClassIds,
    allowedSubjectIds,
  });
}
