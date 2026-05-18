import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  category: z.string().min(1).max(80),
  contactInfo: z.string().min(1).max(200),
  price: z.number().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const posts = await prisma.bulletinPost.findMany({
    where: { isActive: true },
    include: { author: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    posts.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.description,
      category: post.category,
      contactInfo: post.contactInfo,
      price: post.price,
      createdAt: post.createdAt,
      authorName: `${post.author.firstName} ${post.author.lastName}`,
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const created = await prisma.bulletinPost.create({
    data: {
      authorId: session.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      contactInfo: parsed.data.contactInfo,
      price: parsed.data.price,
    },
  });
  return ok(created, 201);
}
