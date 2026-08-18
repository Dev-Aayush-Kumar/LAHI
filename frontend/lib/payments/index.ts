import { AppError, ErrorCodes } from "@/lib/errors";
import { MockPaymentProvider } from "@/lib/payments/mock";
import type { PaymentProvider } from "@/lib/payments/types";

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) {
    return cached;
  }

  const name = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();

  if (name === "mock") {
    cached = new MockPaymentProvider();
    return cached;
  }

  if (name === "razorpay" || name === "stripe") {
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      `${name} is not configured. Use the mock provider in development.`,
      501
    );
  }

  throw new AppError(
    ErrorCodes.INTERNAL_ERROR,
    "Unsupported payment provider.",
    500
  );
}
