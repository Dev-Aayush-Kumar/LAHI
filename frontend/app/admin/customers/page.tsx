import { prisma } from "@/lib/prisma";

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
    },
  });

  return (
    <main>
      <h1 className="text-3xl font-bold">Customers</h1>
      <ul className="mt-6 space-y-3">
        {customers.map((customer) => (
          <li key={customer.id} className="rounded-xl border bg-white p-4">
            {customer.fullName} · {customer.email} · {customer.role} ·{" "}
            {customer.accountStatus}
          </li>
        ))}
      </ul>
    </main>
  );
}
