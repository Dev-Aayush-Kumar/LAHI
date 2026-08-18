import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const products = await prisma.product.findMany({
      include: {
        brand: true,
        category: true,
        variants: { include: { inventory: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return jsonOk({ products });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        isPublished: body.isPublished ?? undefined,
        isActive: body.isActive ?? undefined,
        isFeatured: body.isFeatured ?? undefined,
      },
    });
    return jsonOk({ product });
  } catch (error) {
    return jsonError(error);
  }
}
