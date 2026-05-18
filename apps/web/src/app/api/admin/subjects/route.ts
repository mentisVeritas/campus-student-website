import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(24),
  credits: z.number().int().min(1).max(12).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  try {
    const created = await prisma.subject.create({
      data: {
        name: parsed.data.name.trim(),
        code: parsed.data.code.trim().toUpperCase(),
        credits: parsed.data.credits ?? 3,
      },
      select: { id: true, name: true, code: true, credits: true },
    });
    return ok(created, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint") || message.includes("Subject_code_key")) {
      return fail("Subject code already exists", 409);
    }
    throw error;
  }
}
