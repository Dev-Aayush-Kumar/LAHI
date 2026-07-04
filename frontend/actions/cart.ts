"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";

export async function addToCart(formData: FormData) {
  const variantId = formData.get("variantId") as string;

  const quantity = Number(
    formData.get("quantity")
  );

  const sessionId =
    await getCartSessionId();

  let cart = await prisma.cart.findFirst({
    where: {
      sessionId,
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        sessionId,
      },
    });
  }

  const existingItem =
  await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      variantId,
    },
  });

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