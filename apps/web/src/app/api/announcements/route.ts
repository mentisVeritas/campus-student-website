import { NextRequest } from "next/server";
import { NotificationType, Role } from "@prisma/client";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { buildAnnouncementWhereForUser } from "@/lib/announcement-visibility";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(160),
  content: z.string().min(1).max(5000),
  isPinned: z.boolean().optional(),
  targetRole: z.nativeEnum(Role).nullable().optional(),
  classId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return fail("Unauthorized", 401);
  }
  const scope = request.nextUrl.searchParams.get("scope");
  const where = await buildAnnouncementWhereForUser({
    role: session.role as Role,
    userId: session.userId,
    scope,
  });

  try {
    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        class: { select: { id: true, name: true, year: true } },
        reads: {
          where: { userId: session.userId },
          select: { userId: true },
        },
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    });

    return ok(
      announcements.map((item) => ({
        ...item,
        isRead: item.reads.length > 0,
        reads: undefined,
      })),
    );
  } catch {
    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        class: { select: { id: true, name: true, year: true } },
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    });
    return ok(
      announcements.map((item) => ({
        ...item,
        // Fallback mode: keep announcements unread until explicit open/read flow is used.
        isRead: false,
      })),
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "ADMIN" && session.role !== "TEACHER") {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  let teacherId: string | null = null;
  if (session.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true, classes: { select: { classId: true } } },
    });
    if (!teacher) return fail("Teacher profile not found", 404);
    teacherId = teacher.id;
    const allowedClassIds = new Set(teacher.classes.map((c) => c.classId));
    if (parsed.data.classId && !allowedClassIds.has(parsed.data.classId)) {
      return fail("You can post to only your own classes", 403);
    }
    const roleForTeacher = parsed.data.targetRole ?? null;
    if (roleForTeacher !== null && roleForTeacher !== Role.STUDENT) {
      return fail("Teachers can target only STUDENT or ALL", 400);
    }
    if (parsed.data.classId && roleForTeacher !== Role.STUDENT) {
      return fail("Class-targeted announcements must target STUDENT", 400);
    }
  }

  const created = await prisma.announcement.create({
    data: {
      authorId: session.userId,
      teacherId,
      classId: parsed.data.classId ?? null,
      targetRole: parsed.data.targetRole ?? null,
      title: parsed.data.title,
      content: parsed.data.content,
      isPinned: parsed.data.isPinned ?? false,
    },
    include: {
      author: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  const recipients = await prisma.user.findMany({
    where: {
      id: { not: session.userId },
      ...(parsed.data.classId
        ? {
            role: Role.STUDENT,
            student: { is: { classId: parsed.data.classId } },
          }
        : parsed.data.targetRole
          ? { role: parsed.data.targetRole }
          : {}),
    },
    select: { id: true, role: true },
  });
  if (recipients.length) {
    const linkByRole: Record<Role, string> = {
      ADMIN: "/dashboard/admin/announcements",
      TEACHER: "/dashboard/teacher/announcements",
      STUDENT: "/dashboard/student/announcements",
      CANTEEN_STAFF: "/dashboard/news",
    };
    await prisma.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        type: NotificationType.GENERAL,
        title: "New announcement",
        message: created.title,
        link: linkByRole[user.role] ?? "/dashboard/news",
      })),
    });
  }

  return ok(created, 201);
}
