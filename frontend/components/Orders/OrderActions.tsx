"use client";

import { useState, useTransition } from "react";

import {
  cancelCustomerOrder,
  requestCustomerReturn,
} from "@/lib/actions/order";

type Props = {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
};

export default function OrderActions({
  orderId,
  orderStatus,
  paymentStatus,
}: Props) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const canCancel = ["PENDING_PAYMENT", "PAYMENT_FAILED", "CONFIRMED"].includes(
    orderStatus
  );
  const canReturn = ["CONFIRMED", "FULFILLMENT_READY", "SHIPPED", "DELIVERED"].includes(
    orderStatus
  ) && paymentStatus === "PAID";

  return (
    <div className="mt-8 space-y-3">
      {canCancel ? (
        <button
          disabled={pending}
          className="rounded-xl border px-4 py-2"
          onClick={() =>
            start(async () => {
              try {
                await cancelCustomerOrder(orderId, "customer_cancelled");
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "Cancel failed."
                );
              }
            })
          }
        >
          Cancel order
        </button>
      ) : null}
      {canReturn ? (
        <button
          disabled={pending}
          className="rounded-xl border px-4 py-2"
          onClick={() =>
            start(async () => {
              try {
                await requestCustomerReturn(orderId, "customer_return");
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "Return failed."
                );
              }
            })
          }
        >
          Request return
        </button>
      ) : null}
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </div>
  );
}
