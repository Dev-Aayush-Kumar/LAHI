import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError, ErrorCodes } from "@/lib/errors";
import { setOnHandQuantity } from "@/lib/commerce/inventory";

export async function GET() {
  try {
    await requireAdmin();
    const inventory = await prisma.inventory.findMany({
      include: {
        variant: {
          include: { product: true },
        },
      },
      take: 200,
    });
    return jsonOk({ inventory });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!body.variantId || typeof body.quantity !== "number") {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "variantId and quantity are required.",
        400
      );
    }
    const inventory = await setOnHandQuantity(
      prisma,
      body.variantId,
      body.quantity
    );
    return jsonOk({ inventory });
  } catch (error) {
    return jsonError(error);
  }
}
