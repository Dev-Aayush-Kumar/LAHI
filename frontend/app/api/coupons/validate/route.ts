import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { applyCoupon } from "@/lib/commerce/coupons";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const body = await request.json();
    const result = await applyCoupon(
      prisma,
      body.code,
      Number(body.subtotal ?? 0)
    );
    return jsonOk({
      code: result.coupon?.code,
      discountAmount: result.discountAmount,
    });
  } catch (error) {
    return jsonError(error);
  }
}
