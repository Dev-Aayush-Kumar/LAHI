"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type WishlistResult = {
  success: boolean;
  requiresLogin?: boolean;
};

export async function addToWishlist(
  productId: string
): Promise<WishlistResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      requiresLogin: true,
    };
  }

  await prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId: user.userId,
        productId,
      },
    },
    update: {},
    create: {
      userId: user.userId,
      productId,
    },
  });

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/wishlist");
  revalidatePath(`/product`);

  return {
    success: true,
  };
}

export async function removeFromWishlist(
  productId: string
): Promise<WishlistResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      requiresLogin: true,
    };
  }

  await prisma.wishlistItem.deleteMany({
    where: {
      userId: user.userId,
      productId,
    },
  });

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/wishlist");
  revalidatePath(`/product`);

  return {
    success: true,
  };
}
export async function moveCartItemToWishlist(
  cartItemId: string
): Promise<WishlistResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      requiresLogin: true,
    };
  }

  const cartItem =
    await prisma.cartItem.findUnique({
      where: {
        id: cartItemId,
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

  if (!cartItem) {
    return {
      success: false,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: user.userId,
          productId:
            cartItem.variant.product.id,
        },
      },
      update: {},
      create: {
        userId: user.userId,
        productId:
          cartItem.variant.product.id,
      },
    });

    await tx.cartItem.delete({
      where: {
        id: cartItemId,
      },
    });
  });

  revalidatePath("/", "layout");
  revalidatePath("/cart");
  revalidatePath("/wishlist");
  revalidatePath("/search");
  revalidatePath("/product");

  return {
    success: true,
  };
}