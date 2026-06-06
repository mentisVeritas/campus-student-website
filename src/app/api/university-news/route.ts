import { NextRequest } from "next/server";
import { NotificationType, Role } from "@prisma/client";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const createNewsSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().min(1).max(80),
});

export async function GET(_request: NextRequest) {
  const session = await getApiSession(_request);
  if (!session) return fail("Unauthorized", 401);

  const rows = await prisma.universityNews.findMany({
    orderBy: { publishedAt: "desc" },
    ...(session.role === "ADMIN" ? {} : { take: 50 }),
  });
  return ok(rows);
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "ADMIN") return fail("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = createNewsSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const created = await prisma.universityNews.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
      authorId: session.userId,
    },
  });

  const recipients = await prisma.user.findMany({
    select: { id: true, role: true },
  });
  if (recipients.length) {
    const newsLinkByRole: Record<Role, string> = {
      ADMIN: "/dashboard/admin/news",
      STUDENT: "/dashboard/student/news",
      TEACHER: "/dashboard/news",
      CANTEEN_STAFF: "/dashboard/news",
    };
    await prisma.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        type: NotificationType.GENERAL,
        title: "New article",
        message: created.title,
        link: newsLinkByRole[user.role] ?? "/dashboard/news",
      })),
    });
  }

  return ok(created, 201);
}
