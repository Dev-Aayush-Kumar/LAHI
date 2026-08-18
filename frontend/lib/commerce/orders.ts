import type { PrismaClient } from "@/lib/generated/prisma/client";

import { clearCart, getCartRecord } from "@/lib/commerce/cart";
import {
  decrementReserved,
  releaseStock,
  restoreStock,
} from "@/lib/commerce/inventory";
import { notify } from "@/lib/commerce/notifications";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { PaymentWebhookEvent } from "@/lib/payments/types";

type Db = PrismaClient;

function orderItems(order: {
  items: { variantId: string | null; quantity: number }[];
}) {
  return order.items
    .filter((item) => item.variantId)
    .map((item) => ({
      variantId: item.variantId as string,
      quantity: item.quantity,
    }));
}

export async function applyPaymentEvent(
  db: Db,
  event: PaymentWebhookEvent
) {
  return db.$transaction(async (tx) => {
    const duplicate = await tx.paymentEvent.findUnique({
      where: { providerEventId: event.eventId },
    });
    if (duplicate) {
      return { duplicate: true, paymentId: duplicate.paymentId };
    }

    const payment = await tx.payment.findUnique({
      where: { providerRef: event.providerRef },
      include: {
        order: {
          include: { items: true },
        },
      },
    });

    if (!payment) {
      throw new AppError(
        ErrorCodes.NOT_FOUND,
        "Payment was not found.",
        404
      );
    }

    if (
      payment.status === "SUCCEEDED" &&
      event.status !== "SUCCEEDED"
    ) {
      return { duplicate: true, paymentId: payment.id };
    }

    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        type: event.type,
        providerEventId: event.eventId,
        payload: JSON.parse(JSON.stringify(event.payload)),
      },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: event.status },
    });

    const items = orderItems(payment.order);

    if (event.status === "SUCCEEDED") {
      if (payment.order.paymentStatus !== "PAID") {
        await decrementReserved(tx, items, payment.orderId);
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "PAID",
            orderStatus: "CONFIRMED",
          },
        });

        const cart = await getCartRecord(tx as never, {
          userId: payment.order.userId,
        });
        if (cart) {
          await clearCart(tx as never, cart.id);
        }

        await notify(tx, {
          userId: payment.order.userId,
          orderId: payment.orderId,
          type: "PAYMENT_SUCCEEDED",
          title: "Payment successful",
          body: `Order ${payment.order.orderNumber} is confirmed.`,
        });
      }
    } else if (event.status === "FAILED" || event.status === "CANCELLED") {
      if (payment.order.paymentStatus === "PENDING") {
        await releaseStock(
          tx,
          items,
          payment.orderId,
          event.status === "CANCELLED" ? "payment_cancelled" : "payment_failed"
        );
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: event.status,
            orderStatus:
              event.status === "CANCELLED" ? "CANCELLED" : "PAYMENT_FAILED",
            cancelledAt:
              event.status === "CANCELLED" ? new Date() : payment.order.cancelledAt,
          },
        });
      }
    }

    return { duplicate: false, paymentId: payment.id };
  });
}

export async function cancelOrder(
  db: Db,
  userId: string,
  orderId: string,
  reason: string
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, payments: true },
    });

    if (!order) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Order not found.", 404);
    }

    if (
      !["PENDING_PAYMENT", "PAYMENT_FAILED", "CONFIRMED"].includes(
        order.orderStatus
      )
    ) {
      throw new AppError(
        ErrorCodes.ORDER_NOT_CANCELLABLE,
        "This order can no longer be cancelled.",
        409
      );
    }

    const items = orderItems(order);

    if (order.orderStatus === "CONFIRMED" && order.paymentStatus === "PAID") {
      await restoreStock(tx, items, order.id, "cancellation");
      await tx.refund.create({
        data: {
          orderId: order.id,
          paymentId: order.payments[0]?.id,
          amount: order.totalAmount,
          status: "PENDING",
        },
      });
    } else if (order.orderStatus === "PENDING_PAYMENT") {
      await releaseStock(tx, items, order.id, "cancellation");
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        orderStatus: "CANCELLED",
        paymentStatus:
          order.paymentStatus === "PAID" ? "REFUND_PENDING" : "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    await notify(tx, {
      userId,
      orderId: order.id,
      type: "ORDER_CANCELLED",
      title: "Order cancelled",
      body: `Order ${order.orderNumber} was cancelled.`,
    });

    return order.id;
  });
}

export async function requestReturn(
  db: Db,
  userId: string,
  orderId: string,
  reason: string
) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Order not found.", 404);
  }

  if (!["CONFIRMED", "FULFILLMENT_READY", "SHIPPED", "DELIVERED"].includes(order.orderStatus)) {
    throw new AppError(
      ErrorCodes.ORDER_NOT_RETURNABLE,
      "This order cannot be returned yet.",
      409
    );
  }

  return db.returnRequest.create({
    data: {
      orderId,
      userId,
      reason,
      status: "REQUESTED",
    },
  });
}
