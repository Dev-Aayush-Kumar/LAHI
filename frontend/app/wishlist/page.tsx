import ProductCard from "@/components/Product/ProductCard";
import { getWishlistProducts } from "@/lib/actions/getWishlistProducts";

export default async function WishlistPage() {
  const products = await getWishlistProducts();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      <div className="mb-10">

        <h1 className="text-4xl font-bold">
          My Wishlist
        </h1>

        <p className="mt-3 text-gray-600">
          Save your favourite products here and come back anytime.
        </p>

      </div>

      {products.length === 0 ? (

        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed">

          <div className="text-6xl">
            ❤️
          </div>

          <h2 className="mt-6 text-2xl font-semibold">
            Your wishlist is empty
          </h2>

          <p className="mt-2 text-gray-500">
            Start exploring products and save your favourites.
          </p>

        </div>

      ) : (

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">

          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}

        </div>

      )}

    </main>
  );
}