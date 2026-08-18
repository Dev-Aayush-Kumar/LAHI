import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import MockPayButtons from "@/components/Checkout/MockPayButtons";

export default async function CheckoutPayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.userId },
    include: { payments: true, items: true },
  });

  if (!order) notFound();

  const payment = order.payments[0];

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-bold">Mock payment</h1>
      <p className="mt-3 text-gray-600">
        Order {order.orderNumber} · ₹{Number(order.totalAmount).toLocaleString()}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Development provider only. No real money is moved. Payment is confirmed
        by webhook, not by this page loading.
      </p>

      {payment ? (
        <MockPayButtons
          providerRef={payment.providerRef}
          orderId={order.id}
        />
      ) : (
        <p className="mt-8">No payment intent exists for this order.</p>
      )}
    </main>
  );
}
