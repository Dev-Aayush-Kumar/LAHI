import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { email: true } } },
  });

  return (
    <main>
      <h1 className="text-3xl font-bold">Orders</h1>
      <ul className="mt-6 space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border bg-white p-4">
            {order.orderNumber} · {order.orderStatus} · {order.user.email}
          </li>
        ))}
      </ul>
    </main>
  );
}
