import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/Product/ProductCard";
import ProductImageGallery from "@/components/Product/ProductImageGallery";


type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({
  params,
}: Props) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: {
      slug,
    },
    include: {
      brand: true,
      category: true,
      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      variants: true,
    },
  });

  if (!product) {
    notFound();
  }
  const similarProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: {
        not: product.id,
      },
      isPublished: true,
      isActive: true,
    },
    include: {
      brand: true,
      images: {
        orderBy: {
          sortOrder: "asc",
        },
        take: 1,
      },
    },
    take: 8,
  });
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      <div className="grid gap-12 lg:grid-cols-2">

        {/* LEFT : Images */}

        <section>

          <ProductImageGallery
            images={product.images}
            productName={product.name}
          />

        </section>

        {/* RIGHT : Product Details */}

        <section>

          <p className="text-lg text-gray-500">
            {product.brand.name}
          </p>

          <h1 className="mt-2 text-5xl font-bold">
            {product.name}
          </h1>

          <div className="mt-6 flex items-center gap-4">

            <span className="text-4xl font-bold">
              ₹{Number(product.sellingPrice).toLocaleString()}
            </span>

            {product.compareAtPrice && (
              <span className="text-2xl text-gray-400 line-through">
                ₹{Number(product.compareAtPrice).toLocaleString()}
              </span>
            )}

          </div>

          <div className="mt-10">

            <h3 className="mb-3 font-semibold">
              Sizes
            </h3>

            <div className="flex gap-3">

              <button className="rounded-xl border px-5 py-3">
                S
              </button>

              <button className="rounded-xl border px-5 py-3">
                M
              </button>

              <button className="rounded-xl border px-5 py-3">
                L
              </button>

              <button className="rounded-xl border px-5 py-3">
                XL
              </button>

            </div>

          </div>

          <div className="mt-10">

            <h3 className="mb-3 font-semibold">
              Quantity
            </h3>

            <input
              type="number"
              min={1}
              defaultValue={1}
              className="w-24 rounded-xl border px-4 py-3"
            />

          </div>

          <div className="mt-10 flex gap-4">

            <button className="rounded-xl bg-black px-8 py-4 font-semibold text-white">
              Add to Cart
            </button>

            <button className="rounded-xl border px-8 py-4 font-semibold">
              Wishlist
            </button>

          </div>

        </section>

      </div>

      <section className="mt-20">

        <h2 className="text-3xl font-bold">
          Description
        </h2>

        <p className="mt-5 text-gray-600">
          {product.description}
        </p>

      </section>

      <section className="mt-20">

        <h2 className="text-3xl font-bold">
          Specifications
        </h2>

      </section>

      <section className="mt-20">

        <h2 className="text-3xl font-bold">
          Shipping & Returns
        </h2>

      </section>

      <section className="mt-20">

        <h2 className="text-3xl font-bold">
          Similar Products
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-4">

          {similarProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}

        </div>

      </section>

    </main>
  );
}