import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import OrderActions from "@/components/Orders/OrderActions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");
  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: user.userId },
    include: { items: true, payments: true, returnRequests: true, refunds: true },
  });
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
      <p className="mt-2 text-gray-600">
        {order.orderStatus} · payment {order.paymentStatus}
      </p>
      <ul className="mt-8 space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="rounded-xl border p-4">
            {item.productName} · {item.color} / {item.size} × {item.quantity}
          </li>
        ))}
      </ul>
      <p className="mt-6 font-semibold">
        Total ₹{Number(order.totalAmount).toLocaleString()}
      </p>
      <OrderActions
        orderId={order.id}
        orderStatus={order.orderStatus}
        paymentStatus={order.paymentStatus}
      />
    </main>
  );
}
