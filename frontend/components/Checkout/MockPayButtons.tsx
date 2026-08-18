"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  providerRef: string;
  orderId: string;
};

export default function MockPayButtons({ providerRef, orderId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function simulate(
    outcome: "success" | "failed" | "cancelled",
    extra: Record<string, unknown> = {}
  ) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerRef, outcome, ...extra }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.message ?? "Payment simulation failed.");
        return;
      }
      router.push(`/orders/${orderId}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      <button
        disabled={busy}
        onClick={() => simulate("success")}
        className="w-full rounded-xl bg-black py-3 text-white"
      >
        Simulate successful payment
      </button>
      <button
        disabled={busy}
        onClick={() => simulate("failed")}
        className="w-full rounded-xl border py-3"
      >
        Simulate failed payment
      </button>
      <button
        disabled={busy}
        onClick={() => simulate("cancelled")}
        className="w-full rounded-xl border py-3"
      >
        Simulate cancelled payment
      </button>
      <button
        disabled={busy}
        onClick={() => simulate("success", { duplicate: true })}
        className="w-full rounded-xl border py-3"
      >
        Simulate duplicate webhook
      </button>
      <button
        disabled={busy}
        onClick={() => simulate("success", { delayMs: 1500 })}
        className="w-full rounded-xl border py-3"
      >
        Simulate delayed webhook
      </button>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </div>
  );
}
