import { prisma } from "@/lib/prisma";

export async function getFeaturedProducts() {
  return prisma.product.findMany({
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
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 8,
  });
}