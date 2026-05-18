import { MealCategory } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { parseIsoDateUtcCalendar } from "@/lib/parse-local-date";

const createSchema = z.object({
  date: z.string(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().nonnegative(),
      category: z.nativeEnum(MealCategory),
      available: z.boolean().optional(),
      calories: z.number().int().positive().optional(),
    }),
  ),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return fail("Unauthorized", 401);
  }

  const dateQuery = request.nextUrl.searchParams.get("date");
  let date: Date;
  if (dateQuery) {
    const parsed = parseIsoDateUtcCalendar(dateQuery);
    if (!parsed) return fail("Invalid date", 400);
    date = parsed;
  } else {
    const n = new Date();
    date = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  }

  const menu = await prisma.canteenMenu.findUnique({
    where: { date },
    include: {
      items: { orderBy: [{ category: "asc" }, { name: "asc" }] },
    },
  });

  return ok(menu ?? { date, items: [] });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["CANTEEN_STAFF", "ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid request body", 400);
  }

  const date = parseIsoDateUtcCalendar(parsed.data.date);
  if (!date) return fail("Invalid date", 400);

  const menu = await prisma.canteenMenu.upsert({
    where: { date },
    update: {},
    create: { date },
  });

  if (parsed.data.items.length) {
    await prisma.canteenItem.createMany({
      data: parsed.data.items.map((item) => ({
        menuId: menu.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        available: item.available ?? true,
        calories: item.calories,
      })),
    });
  }

  const withItems = await prisma.canteenMenu.findUnique({
    where: { id: menu.id },
    include: { items: true },
  });

  return ok(withItems, 201);
}
