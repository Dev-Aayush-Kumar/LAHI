import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  const { productId } = await params;

  const product =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },

      include: {
        brand: true,

        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
        },
      },
    });

  if (!product) {
    return NextResponse.json(
      {
        success: false,
        message: "Product not found",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    success: true,

    product: {
      id: product.id,

      name: product.name,

      brand: product.brand.name,

      sellingPrice: Number(
        product.sellingPrice
      ),

      imageUrl:
        product.images[0]?.imageUrl ?? null,
    },
  });
}