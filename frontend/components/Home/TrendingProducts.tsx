import ProductCard from "@/components/Product/ProductCard";
import { products } from "@/data/products";
export default function TrendingProducts() {
  const TrendingProducts = products.filter(
  (product) => product.isTrending
);
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
              key={product.name}
              {...product}
            />
          ))}
        </div>

      </div>
    </section>
  );
}