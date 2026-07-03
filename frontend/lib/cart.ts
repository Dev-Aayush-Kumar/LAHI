import { cookies } from "next/headers";

const CART_COOKIE = "lahi_cart";

export async function getCartSessionId() {
  const cookieStore = await cookies();

  return cookieStore.get(CART_COOKIE)?.value ?? null;
}