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
      images: true,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 8,
  });
}