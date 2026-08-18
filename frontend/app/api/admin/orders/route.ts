import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError, ErrorCodes } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();
    const orders = await prisma.order.findMany({
      include: { items: true, user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return jsonOk({ orders });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!body.id || !body.orderStatus) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Order status is required.", 400);
    }
    const order = await prisma.order.update({
      where: { id: body.id },
      data: { orderStatus: body.orderStatus },
    });
    return jsonOk({ order });
  } catch (error) {
    return jsonError(error);
  }
}
