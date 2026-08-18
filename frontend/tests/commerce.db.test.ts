import "dotenv/config";
import assert from "node:assert/strict";

import { prisma } from "../lib/prisma";
import { createCheckout } from "../lib/commerce/checkout";
import { applyPaymentEvent, cancelOrder } from "../lib/commerce/orders";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("Skipping commerce DB tests: DATABASE_URL is not set.");
    return;
  }

  const variant = await prisma.productVariant.findFirst({
    include: { inventory: true, product: true },
  });
  if (!variant?.inventory) {
    throw new Error("Seed a catalog with inventory before running DB tests.");
  }

  const marker = Date.now();
  const user = await prisma.user.create({
    data: {
      fullName: "Checkout Test",
      email: `checkout-${marker}@example.com`,
      passwordHash: "unused",
    },
  });
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      fullName: "Checkout Test",
      phone: "9999999999",
      addressLine1: "Line 1",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      isDefault: true,
    },
  });
  const cart = await prisma.cart.create({
    data: { userId: user.id },
  });
  await prisma.cartItem.create({
    data: { cartId: cart.id, variantId: variant.id, quantity: 1 },
  });

  try {
    const order = await createCheckout(prisma, {
      userId: user.id,
      addressId: address.id,
      idempotencyKey: `idem-${marker}`,
    });
    assert.equal(order.orderStatus, "PENDING_PAYMENT");
    const again = await createCheckout(prisma, {
      userId: user.id,
      addressId: address.id,
      idempotencyKey: `idem-${marker}`,
    });
    assert.equal(again.id, order.id);

    const payment = order.payments[0];
    await applyPaymentEvent(prisma, {
      eventId: `evt-${marker}`,
      type: "payment.success",
      providerRef: payment.providerRef,
      status: "SUCCEEDED",
      payload: { providerRef: payment.providerRef },
    });
    const duplicate = await applyPaymentEvent(prisma, {
      eventId: `evt-${marker}`,
      type: "payment.success",
      providerRef: payment.providerRef,
      status: "SUCCEEDED",
      payload: { providerRef: payment.providerRef },
    });
    assert.equal(duplicate.duplicate, true);

    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(paid.paymentStatus, "PAID");

    await cancelOrder(prisma, user.id, order.id, "test_cancel");
    const cancelled = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    assert.equal(cancelled.orderStatus, "CANCELLED");
    console.log("commerce.db.test ok");
  } finally {
    await prisma.paymentEvent.deleteMany({
      where: { payment: { order: { userId: user.id } } },
    });
    await prisma.refund.deleteMany({ where: { order: { userId: user.id } } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.cart.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
