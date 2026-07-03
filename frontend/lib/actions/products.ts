import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function getFeaturedProducts() {
  const user = await getCurrentUser();

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      isFeatured: true,
      isActive: true,
    },

    include: {
      brand: true,
      category: true,

      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      variants: {
        where: {
          isDefault: true,
        },
        take: 1,
      },

      wishlistItems: user
        ? {
            where: {
              userId: user.userId,
            },
          }
        : false,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 8,
  });

  return products.map((product) => ({
    ...product,

    isWishlisted:
      (product.wishlistItems?.length ?? 0) > 0,
  }));
}