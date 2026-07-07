"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";

export async function addToCart(formData: FormData) {
  const variantId = formData.get("variantId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!variantId || quantity <= 0) {
    throw new Error("Invalid cart request.");
  }

  const user = await getCurrentUser();
  const sessionId = await getCartSessionId();

  let cart = await prisma.cart.findFirst({
    where: user
      ? {
          userId: user.userId,
        }
      : {
          sessionId: sessionId!,
        },
  });
  console.log("ADD TO CART - USER:", user);
  console.log("ADD TO CART - SESSION:", sessionId);
  if (!cart) {
    cart = await prisma.cart.create({
      data: user
        ? {
            userId: user.userId,
          }
        : {
            sessionId: sessionId!,
          },
    });
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      variantId,
    },
  });
  console.log("ADD TO CART - CART ID:", cart.id);
  console.log("ADD TO CART - CART SESSION:", cart.sessionId);
  if (existingItem) {
    await prisma.cartItem.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: {
          increment: quantity,
        },
      },
    });

    console.log("Updated existing cart item");
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId,
        quantity,
      },
    });

    console.log("Created new cart item");
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItem(
  cartItemId: string
) {
  await prisma.cartItem.delete({
    where: {
      id: cartItemId,
    },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}