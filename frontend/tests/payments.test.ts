import assert from "node:assert/strict";
import test from "node:test";

import { MockPaymentProvider, signMockWebhook } from "../lib/payments/mock";

test("mock provider can simulate success failure cancel and duplicate events", async () => {
  const provider = new MockPaymentProvider();
  const intent = await provider.createIntent({
    amount: 199,
    currency: "INR",
    orderId: "order_1",
  });
  assert.equal(intent.status, "REQUIRES_ACTION");

  const success = await provider.simulate(intent.id, "success");
  assert.equal(success.status, "SUCCEEDED");

  const raw = JSON.stringify({
    ...success.payload,
    eventId: success.eventId,
    providerRef: success.providerRef,
    status: success.status,
    type: success.type,
  });
  const headers = new Headers({
    "x-lahi-payment-signature": signMockWebhook(raw),
  });
  const parsed = await provider.parseWebhook(headers, raw);
  assert.equal(parsed.eventId, success.eventId);

  const duplicate = await provider.parseWebhook(headers, raw);
  assert.equal(duplicate.eventId, success.eventId);

  const failedIntent = await provider.createIntent({
    amount: 10,
    currency: "INR",
    orderId: "order_2",
  });
  assert.equal((await provider.simulate(failedIntent.id, "failed")).status, "FAILED");
  assert.equal(
    (await provider.simulate(
      (
        await provider.createIntent({
          amount: 10,
          currency: "INR",
          orderId: "order_3",
        })
      ).id,
      "cancelled"
    )).status,
    "CANCELLED"
  );
});
