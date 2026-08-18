"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import {
  addCartItem,
  getCartRecord,
  removeCartItem as removeOwnedCartItem,
  updateCartItemQuantity,
} from "@/lib/commerce/cart";
import { calculateOrderTotals } from "@/lib/commerce/money";

function identityFrom(
  user: { userId: string } | null,
  sessionId: string | null
) {
  return {
    userId: user?.userId,
    sessionId,
  };
}

function serializeCart(cart: NonNullable<Awaited<ReturnType<typeof getCartRecord>>>) {
  const subtotal = cart.items.reduce(
    (total, item) => total + Number(item.variant.price) * item.quantity,
    0
  );
  const totals = calculateOrderTotals({ subtotal });

  return {
    cart: {
      ...cart,
      items: cart.items.map((item) => ({
        ...item,
        variant: {
          ...item.variant,
          price: Number(item.variant.price),
          product: {
            ...item.variant.product,
            dealerPrice: Number(item.variant.product.dealerPrice),
            markupPercent: Number(item.variant.product.markupPercent),
            sellingPrice: Number(item.variant.product.sellingPrice),
            compareAtPrice: item.variant.product.compareAtPrice
              ? Number(item.variant.product.compareAtPrice)
              : null,
            discountPercent: item.variant.product.discountPercent
              ? Number(item.variant.product.discountPercent)
              : null,
            rating: Number(item.variant.product.rating),
            isWishlisted:
              (item.variant.product.wishlistItems?.length ?? 0) > 0,
          },
        },
      })),
    },
    ...totals,
  };
}

export async function getCart() {
  const sessionId = await getCartSessionId();
  const user = await getCurrentUser();
  const cart = await getCartRecord(prisma, identityFrom(user, sessionId));
  if (!cart) return null;
  return serializeCart(cart);
}

export async function addToCart(formData: FormData) {
  const variantId = formData.get("variantId") as string;
  const quantity = Number(formData.get("quantity"));
  const user = await getCurrentUser();
  const sessionId = await getCartSessionId();
  await addCartItem(prisma, identityFrom(user, sessionId), variantId, quantity);
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItem(cartItemId: string) {
  const user = await getCurrentUser();
  const sessionId = await getCartSessionId();
  await removeOwnedCartItem(prisma, identityFrom(user, sessionId), cartItemId);
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function setCartItemQuantity(cartItemId: string, quantity: number) {
  const user = await getCurrentUser();
  const sessionId = await getCartSessionId();
  await updateCartItemQuantity(
    prisma,
    identityFrom(user, sessionId),
    cartItemId,
    quantity
  );
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
