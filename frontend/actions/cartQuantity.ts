"use server";

import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";
import { revalidatePath } from "next/cache";

export async function increaseQuantity(
  cartItemId: string
) {
  const sessionId = await getCartSessionId();

  const cart = await prisma.cart.findFirst({
    where: {
      sessionId,
    },
  });

  if (!cart) return;

  await prisma.cartItem.update({
    where: {
      id: cartItemId,
    },
    data: {
      quantity: {
        increment: 1,
      },
    },
  });

  revalidatePath("/cart");
}

export async function decreaseQuantity(
  cartItemId: string
) {
  const sessionId = await getCartSessionId();

  const cart = await prisma.cart.findFirst({
    where: {
      sessionId,
    },
  });

  if (!cart) return;

  const item = await prisma.cartItem.findUnique({
    where: {
      id: cartItemId,
    },
  });

  if (!item) return;

  if (item.quantity <= 1) {
    await prisma.cartItem.delete({
      where: {
        id: cartItemId,
      },
    });
  } else {
    await prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        quantity: {
          decrement: 1,
        },
      },
    });
  }

  revalidatePath("/cart");
}