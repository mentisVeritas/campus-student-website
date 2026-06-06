import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, type UserRole, verifySessionToken } from "@/lib/auth";

const roleHome: Record<UserRole, string> = {
  ADMIN: "/dashboard/admin",
  TEACHER: "/dashboard/teacher",
  STUDENT: "/dashboard/student",
  CANTEEN_STAFF: "/dashboard/canteen",
};

const rolePrefixes: Record<UserRole, string[]> = {
  ADMIN: ["/dashboard/admin", "/dashboard/change-password", "/dashboard/system-blocked"],
  TEACHER: ["/dashboard/teacher", "/dashboard/change-password", "/dashboard/system-blocked"],
  STUDENT: ["/dashboard/student", "/dashboard/change-password", "/dashboard/system-blocked"],
  CANTEEN_STAFF: ["/dashboard/canteen", "/dashboard/change-password", "/dashboard/system-blocked"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL(roleHome[session.role], request.url));
  }

  if (session.mustChangePass && pathname !== "/dashboard/change-password") {
    return NextResponse.redirect(new URL("/dashboard/change-password", request.url));
  }

  if (!session.mustChangePass && pathname === "/dashboard/change-password") {
    return NextResponse.redirect(new URL(roleHome[session.role], request.url));
  }

  const allowedPrefixes = rolePrefixes[session.role];
  if (!allowedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL(roleHome[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
