import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createCheckout } from "@/lib/commerce/checkout";
import { jsonError, jsonOk } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { AppError, ErrorCodes } from "@/lib/errors";
import { createCorrelationId, log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get("x-request-id") ?? createCorrelationId();
  try {
    const user = await requireUser();
    const limited = rateLimit(`checkout:${user.userId}`, 10, 60_000);
    if (!limited.ok) {
      throw new AppError(ErrorCodes.RATE_LIMITED, "Too many checkout attempts.", 429);
    }

    const body = await request.json();
    const order = await createCheckout(prisma, {
      userId: user.userId,
      addressId: body.addressId,
      couponCode: body.couponCode,
      idempotencyKey:
        request.headers.get("idempotency-key") ?? body.idempotencyKey,
    });

    log("info", "Checkout created", {
      correlationId,
      userId: user.userId,
      orderId: order.id,
    });

    return jsonOk({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (error) {
    return jsonError(error, correlationId);
  }
}
