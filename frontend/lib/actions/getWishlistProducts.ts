"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function getWishlistProducts() {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const wishlist = await prisma.wishlistItem.findMany({
    where: {
      userId: user.userId,
    },

    include: {
      product: {
        include: {
          brand: true,

          images: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
          },

          variants: {
            where: {
              isDefault: true,
            },
            take: 1,
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return wishlist.map((item) => ({
    ...item.product,

    sellingPrice: Number(item.product.sellingPrice),

    compareAtPrice: item.product.compareAtPrice
      ? Number(item.product.compareAtPrice)
      : null,

    isWishlisted: true,
  }));
}