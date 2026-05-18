import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ data: { authenticated: false } });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ data: { authenticated: false } });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      mustChangePass: true,
    },
  });

  if (!user) {
    return NextResponse.json({ data: { authenticated: false } });
  }

  return NextResponse.json({
    data: {
      authenticated: true,
      user,
    },
  });
}
