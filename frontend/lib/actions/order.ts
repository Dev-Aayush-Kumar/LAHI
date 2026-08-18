"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createCheckout } from "@/lib/commerce/checkout";
import { cancelOrder, requestReturn } from "@/lib/commerce/orders";

export async function placeOrder(addressId: string, couponCode?: string) {
  const user = await requireUser();
  const order = await createCheckout(prisma, {
    userId: user.userId,
    addressId,
    couponCode,
  });

  revalidatePath("/orders");
  revalidatePath("/cart");
  redirect(`/checkout/pay/${order.id}`);
}

export async function cancelCustomerOrder(orderId: string, reason: string) {
  const user = await requireUser();
  await cancelOrder(prisma, user.userId, orderId, reason);
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function requestCustomerReturn(orderId: string, reason: string) {
  const user = await requireUser();
  await requestReturn(prisma, user.userId, orderId, reason);
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}
