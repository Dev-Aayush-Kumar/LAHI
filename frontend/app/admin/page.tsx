import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const [products, orders, jobs, customers] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.tryOnJob.count(),
    prisma.user.count(),
  ]);

  return (
    <main>
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-gray-600">
        Server-side role checks protect every admin route. Hiding links is not
        the access control.
      </p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-6">
          <dt>Products</dt>
          <dd className="text-2xl font-bold">{products}</dd>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <dt>Orders</dt>
          <dd className="text-2xl font-bold">{orders}</dd>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <dt>Customers</dt>
          <dd className="text-2xl font-bold">{customers}</dd>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <dt>AI jobs</dt>
          <dd className="text-2xl font-bold">{jobs}</dd>
        </div>
      </dl>
    </main>
  );
}
