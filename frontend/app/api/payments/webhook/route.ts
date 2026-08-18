import { NextRequest } from "next/server";

import { applyPaymentEvent } from "@/lib/commerce/orders";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { createCorrelationId, log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const correlationId =
    request.headers.get("x-request-id") ?? createCorrelationId();
  const rawBody = await request.text();

  try {
    const event = await getPaymentProvider().parseWebhook(
      request.headers,
      rawBody
    );
    const result = await applyPaymentEvent(prisma, event);
    log("info", "Payment webhook processed", {
      correlationId,
      eventId: event.eventId,
      duplicate: result.duplicate,
    });
    return jsonOk({ received: true, duplicate: result.duplicate });
  } catch (error) {
    return jsonError(error, correlationId);
  }
}
