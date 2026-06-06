import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { parseIsoDateUtcCalendar } from "@/lib/parse-local-date";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  fromDate: z.string(),
});

export async function POST(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["CANTEEN_STAFF", "ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const sourceDate = parseIsoDateUtcCalendar(parsed.data.fromDate);
  if (!sourceDate) return fail("Invalid fromDate", 400);

  const source = await prisma.canteenMenu.findUnique({
    where: { date: sourceDate },
    include: { items: true },
  });
  if (!source) return fail("Source menu not found", 404);

  const target = await prisma.canteenMenu.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) return fail("Target menu not found", 404);

  await prisma.canteenItem.deleteMany({ where: { menuId: target.id } });
  if (source.items.length) {
    await prisma.canteenItem.createMany({
      data: source.items.map((item) => ({
        menuId: target.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        available: item.available,
        calories: item.calories,
      })),
    });
  }

  const result = await prisma.canteenMenu.findUnique({
    where: { id: target.id },
    include: { items: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
  });
  return ok(result);
}
