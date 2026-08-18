import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function OrdersPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-4xl font-bold">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-600">You have not placed an order yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl border bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">
                    {order.orderStatus} · {order.paymentStatus}
                  </p>
                </div>
                <Link className="underline" href={`/orders/${order.id}`}>
                  View
                </Link>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                {order.items.length} item(s) · ₹
                {Number(order.totalAmount).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
