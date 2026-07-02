import ProductCard from "@/components/Product/ProductCard";
import { searchProducts } from "@/lib/actions/search";

type Props = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({
  searchParams,
}: Props) {
  const { q = "" } = await searchParams;

  const products = await searchProducts(q);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      <h1 className="text-4xl font-bold">
        Search Results
      </h1>

      <p className="mt-2 text-gray-500">
        {products.length} product(s) found for "{q}"
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-4">

        {products.map((product: any) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}

      </div>

    </main>
  );
}