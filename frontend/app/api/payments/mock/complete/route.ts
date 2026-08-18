import { NextRequest } from "next/server";

import { applyPaymentEvent } from "@/lib/commerce/orders";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { signMockWebhook } from "@/lib/payments/mock";
import { AppError, ErrorCodes } from "@/lib/errors";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const limited = rateLimit(`paymock:${user.userId}`, 20, 60_000);
    if (!limited.ok) {
      throw new AppError(ErrorCodes.RATE_LIMITED, "Too many payment attempts.", 429);
    }

    const body = await request.json();
    const payment = await prisma.payment.findFirst({
      where: {
        providerRef: body.providerRef,
        order: { userId: user.userId },
      },
    });
    if (!payment) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Payment not found.", 404);
    }

    const provider = getPaymentProvider();
    if (!provider.simulate) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "This payment provider cannot be simulated.",
        400
      );
    }

    const delayMs = Number(body.delayMs ?? 0);
    const outcomes = Array.isArray(body.duplicate)
      ? body.duplicate
      : undefined;
    const event = await provider.simulate(
      payment.providerRef,
      body.outcome ?? "success"
    );

    const dispatch = async (eventId = event.eventId) => {
      const payload = JSON.stringify({ ...event.payload, eventId, providerRef: event.providerRef, status: event.status, type: event.type });
      const headers = new Headers({
        "x-lahi-payment-signature": signMockWebhook(payload),
        "content-type": "application/json",
      });
      return applyPaymentEvent(
        prisma,
        await provider.parseWebhook(headers, payload)
      );
    };

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 5000)));
    }

    const first = await dispatch();
    if (body.duplicate === true || outcomes) {
      await dispatch(event.eventId);
    }

    return jsonOk({ simulated: true, duplicate: first.duplicate });
  } catch (error) {
    return jsonError(error);
  }
}
