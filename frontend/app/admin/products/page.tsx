import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { brand: true, category: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <main>
      <h1 className="text-3xl font-bold">Products</h1>
      <ul className="mt-6 space-y-3">
        {products.map((product) => (
          <li key={product.id} className="rounded-xl border bg-white p-4">
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm text-gray-500">
              {product.brand.name} · {product.category.name} ·{" "}
              {product.isPublished ? "published" : "draft"}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
