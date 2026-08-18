export type PaymentOutcome =
  | "success"
  | "failed"
  | "cancelled";

export type PaymentIntentStatus =
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type PaymentIntent = {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  clientSecret: string;
  checkoutUrl?: string;
  metadata?: Record<string, string>;
};

export type PaymentWebhookEvent = {
  eventId: string;
  type: string;
  providerRef: string;
  status: PaymentIntentStatus;
  payload: Record<string, unknown>;
};

export type CreatePaymentIntentInput = {
  amount: number;
  currency: string;
  orderId: string;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
};

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  getIntent(providerRef: string): Promise<PaymentIntent | null>;
  parseWebhook(
    headers: Headers,
    rawBody: string
  ): Promise<PaymentWebhookEvent>;
  simulate?(
    providerRef: string,
    outcome: PaymentOutcome
  ): Promise<PaymentWebhookEvent>;
}
