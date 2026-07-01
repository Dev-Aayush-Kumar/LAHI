import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const CART_COOKIE = "lahi_cart";

export async function getCartSessionId() {
  const cookieStore = await cookies();

  let sessionId = cookieStore.get(CART_COOKIE)?.value;

  if (!sessionId) {
    sessionId = randomUUID();

    cookieStore.set(CART_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return sessionId;
}