import { randomUUID } from "crypto";

import type { PrismaClient } from "@/lib/generated/prisma/client";

import { getCartRecord } from "@/lib/commerce/cart";
import { applyCoupon } from "@/lib/commerce/coupons";
import { reserveStock } from "@/lib/commerce/inventory";
import { calculateOrderTotals } from "@/lib/commerce/money";
import { notify } from "@/lib/commerce/notifications";
import { AppError, ErrorCodes } from "@/lib/errors";
import { getPaymentProvider } from "@/lib/payments";

type Db = PrismaClient;

export async function createCheckout(
  db: Db,
  input: {
    userId: string;
    addressId: string;
    couponCode?: string;
    idempotencyKey?: string;
  }
) {
  if (input.idempotencyKey) {
    const existing = await db.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { payments: true, items: true },
    });
    if (existing) {
      return existing;
    }
  }

  return db.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: { id: input.addressId, userId: input.userId },
    });

    if (!address) {
      throw new AppError(
        ErrorCodes.ADDRESS_INVALID,
        "Please choose a valid delivery address.",
        400
      );
    }

    const cart = await getCartRecord(tx as never, {
      userId: input.userId,
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError(ErrorCodes.CART_EMPTY, "Your cart is empty.", 400);
    }

    const stockItems = cart.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    const subtotal = cart.items.reduce(
      (total, item) => total + Number(item.variant.price) * item.quantity,
      0
    );

    const { coupon, discountAmount } = await applyCoupon(
      tx,
      input.couponCode,
      subtotal
    );
    const totals = calculateOrderTotals({ subtotal, discountAmount });
    const orderNumber = `LAHI-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        tax: totals.tax,
        discountAmount: totals.discountAmount,
        totalAmount: totals.total,
        paymentMethod: process.env.PAYMENT_PROVIDER ?? "mock",
        paymentStatus: "PENDING",
        orderStatus: "PENDING_PAYMENT",
        couponCode: coupon?.code,
        idempotencyKey: input.idempotencyKey,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        items: {
          create: cart.items.map((item) => ({
            productId: item.variant.productId,
            variantId: item.variantId,
            productName: item.variant.product.name,
            color: item.variant.color,
            size: item.variant.size,
            quantity: item.quantity,
            price: item.variant.price,
          })),
        },
      },
      include: { items: true },
    });

    await reserveStock(tx, stockItems, order.id);

    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId: input.userId,
          orderId: order.id,
        },
      });
    }

    const provider = getPaymentProvider();
    const intent = await provider.createIntent({
      amount: totals.total,
      currency: "INR",
      orderId: order.id,
      idempotencyKey: input.idempotencyKey,
      metadata: { orderNumber },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        providerRef: intent.id,
        amount: totals.total,
        currency: intent.currency,
        status: intent.status,
        clientSecret: intent.clientSecret,
        idempotencyKey: input.idempotencyKey
          ? `pay_${input.idempotencyKey}`
          : undefined,
        metadata: intent.metadata,
      },
    });

    await notify(tx, {
      userId: input.userId,
      orderId: order.id,
      type: "ORDER_CREATED",
      title: "Order created",
      body: `Order ${orderNumber} is waiting for payment.`,
    });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true, items: true },
    });
  });
}
