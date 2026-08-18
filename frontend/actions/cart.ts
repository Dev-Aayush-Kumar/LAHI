"use server";

import { addToCart, removeCartItem, setCartItemQuantity } from "@/lib/actions/cart";

export { addToCart, removeCartItem };

export async function increaseQuantity(cartItemId: string) {
  const { getCart } = await import("@/lib/actions/cart");
  const cartData = await getCart();
  const item = cartData?.cart.items.find((entry) => entry.id === cartItemId);
  await setCartItemQuantity(cartItemId, (item?.quantity ?? 0) + 1);
}

export async function decreaseQuantity(cartItemId: string) {
  const { getCart } = await import("@/lib/actions/cart");
  const cartData = await getCart();
  const item = cartData?.cart.items.find((entry) => entry.id === cartItemId);
  await setCartItemQuantity(cartItemId, (item?.quantity ?? 1) - 1);
}
