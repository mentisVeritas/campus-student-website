import { MealCategory } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  category: z.nativeEnum(MealCategory),
  available: z.boolean().optional(),
  calories: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["CANTEEN_STAFF", "ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { id: menuId } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  const created = await prisma.canteenItem.create({
    data: {
      menuId,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      category: parsed.data.category,
      available: parsed.data.available ?? true,
      calories: parsed.data.calories,
    },
  });

  return ok(created, 201);
}
