import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { verifySessionToken } from "@/lib/session";

const AUTH_ROUTES = ["/login", "/signup"];

const PROTECTED_ROUTES = [
  "/profile",
  "/dashboard",
  "/try-on",
  "/wishlist",
  "/orders",
];

const CART_COOKIE = "lahi_cart";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  // --------------------------
  // Guest Cart Cookie
  // --------------------------

  if (!request.cookies.get(CART_COOKIE)) {
    response.cookies.set({
      name: CART_COOKIE,
      value: randomUUID(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const sessionCookie =
    request.cookies.get("lahi_session")?.value;

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

  const requiresAuth =
    PROTECTED_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

  if (requiresAuth && !isAuthenticated) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};