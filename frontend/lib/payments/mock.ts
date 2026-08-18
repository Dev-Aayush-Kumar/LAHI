import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import { AppError, ErrorCodes } from "@/lib/errors";
import type {
  CreatePaymentIntentInput,
  PaymentIntent,
  PaymentOutcome,
  PaymentProvider,
  PaymentWebhookEvent,
} from "@/lib/payments/types";

const intents = new Map<string, PaymentIntent>();

function webhookSecret() {
  return process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-mock-webhook-secret";
}

export function signMockWebhook(rawBody: string) {
  return createHmac("sha256", webhookSecret()).update(rawBody).digest("hex");
}

function verifySignature(headers: Headers, rawBody: string) {
  const signature = headers.get("x-lahi-payment-signature") ?? "";
  const expected = signMockWebhook(rawBody);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      "Invalid payment webhook signature.",
      401
    );
  }
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createIntent(
    input: CreatePaymentIntentInput
  ): Promise<PaymentIntent> {
    const id = `mock_${randomUUID()}`;
    const intent: PaymentIntent = {
      id,
      provider: this.name,
      amount: input.amount,
      currency: input.currency,
      status: "REQUIRES_ACTION",
      clientSecret: `secret_${randomUUID()}`,
      checkoutUrl: `/checkout/pay/${input.orderId}`,
      metadata: {
        orderId: input.orderId,
        ...input.metadata,
      },
    };
    intents.set(id, intent);
    return intent;
  }

  async getIntent(providerRef: string): Promise<PaymentIntent | null> {
    return intents.get(providerRef) ?? null;
  }

  async parseWebhook(
    headers: Headers,
    rawBody: string
  ): Promise<PaymentWebhookEvent> {
    verifySignature(headers, rawBody);
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const providerRef = String(payload.providerRef ?? "");
    const status = String(payload.status ?? "") as PaymentIntent["status"];
    const eventId = String(payload.eventId ?? "");

    if (!providerRef || !eventId || !status) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid payment webhook payload.",
        400
      );
    }

    const existing = intents.get(providerRef);
    if (existing) {
      existing.status = status;
    }

    return {
      eventId,
      type: String(payload.type ?? "payment.updated"),
      providerRef,
      status,
      payload,
    };
  }

  async simulate(
    providerRef: string,
    outcome: PaymentOutcome
  ): Promise<PaymentWebhookEvent> {
    const intent = intents.get(providerRef);
    if (!intent) {
      throw new AppError(
        ErrorCodes.NOT_FOUND,
        "Payment intent not found.",
        404
      );
    }

    const status =
      outcome === "success"
        ? "SUCCEEDED"
        : outcome === "cancelled"
          ? "CANCELLED"
          : "FAILED";

    intent.status = status;

    return {
      eventId: `evt_${randomUUID()}`,
      type: `payment.${outcome}`,
      providerRef,
      status,
      payload: {
        providerRef,
        status,
        outcome,
      },
    };
  }
}
