"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addToWishlist(
  productId: string
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Please login first.");
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
}

export async function removeFromWishlist(
  productId: string
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Please login first.");
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
}