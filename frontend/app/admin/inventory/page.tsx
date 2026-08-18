import { prisma } from "@/lib/prisma";

export default async function AdminInventoryPage() {
  const inventory = await prisma.inventory.findMany({
    include: { variant: { include: { product: true } } },
    take: 100,
  });

  return (
    <main>
      <h1 className="text-3xl font-bold">Inventory</h1>
      <ul className="mt-6 space-y-3">
        {inventory.map((row) => (
          <li key={row.id} className="rounded-xl border bg-white p-4">
            {row.variant.product.name} · {row.variant.size}/{row.variant.color}
            <span className="block text-sm text-gray-500">
              on hand {row.quantity} · reserved {row.reserved} · available{" "}
              {Math.max(row.quantity - row.reserved, 0)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
