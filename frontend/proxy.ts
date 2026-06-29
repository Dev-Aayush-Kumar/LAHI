import { NextRequest, NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/session";

const AUTH_ROUTES = ["/login", "/signup"];

const PROTECTED_ROUTES = [
  "/profile",
  "/dashboard",
  "/try-on",
  "/wishlist",
  "/orders",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get("lahi_session")?.value;

  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      await verifySessionToken(sessionCookie);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  if (
    AUTH_ROUTES.includes(pathname) &&
    isAuthenticated
  ) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  const requiresAuth = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (requiresAuth && !isAuthenticated) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/profile/:path*",
    "/dashboard/:path*",
    "/try-on/:path*",
    "/wishlist/:path*",
    "/orders/:path*",
  ],
};