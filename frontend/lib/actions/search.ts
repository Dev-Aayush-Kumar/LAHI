"use server";

import { prisma } from "@/lib/prisma";

export async function searchProducts(query: string) {
  if (!query.trim()) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      isActive: true,

      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          brand: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      ],
    },

    include: {
    brand: true,

    images: {
        take: 1,
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

    take: 8,
  });
  return JSON.parse(JSON.stringify(products));
}