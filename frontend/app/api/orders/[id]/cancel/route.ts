import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { cancelOrder } from "@/lib/commerce/orders";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    await cancelOrder(
      prisma,
      user.userId,
      id,
      typeof body.reason === "string" ? body.reason : "customer_cancelled"
    );
    return jsonOk({ cancelled: true });
  } catch (error) {
    return jsonError(error);
  }
}
