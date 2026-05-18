import { LostFoundStatus, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  location: z.string().min(1).max(120),
  status: z.nativeEnum(LostFoundStatus).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const items = await prisma.lostFoundItem.findMany({
    include: { reporter: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      location: item.location,
      status: item.status,
      foundDate: item.foundDate,
      createdAt: item.createdAt,
      reporterName: `${item.reporter.firstName} ${item.reporter.lastName}`,
      canEdit: session.role === Role.ADMIN || item.reportedBy === session.userId,
      isMine: item.reportedBy === session.userId,
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const created = await prisma.lostFoundItem.create({
    data: {
      reportedBy: session.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      status: parsed.data.status ?? "LOST",
      foundDate: parsed.data.status === "FOUND" ? new Date() : null,
    },
  });
  return ok(created, 201);
}
