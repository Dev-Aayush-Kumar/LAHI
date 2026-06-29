import ProductCard from "@/components/Product/ProductCard";

import { getFeaturedProducts } from "@/lib/actions/products";

export default async function TrendingProducts() {
  const products = await getFeaturedProducts();

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">

        <h2 className="text-center text-4xl font-bold">
          Trending Products
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
          Discover our handpicked collection of trending fashion.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>

      </div>
    </section>
  );
}