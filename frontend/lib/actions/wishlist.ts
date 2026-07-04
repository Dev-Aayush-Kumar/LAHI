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