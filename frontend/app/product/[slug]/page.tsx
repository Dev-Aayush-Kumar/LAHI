import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/Product/ProductCard";
import ProductImageGallery from "@/components/Product/ProductImageGallery";
import ProductInfo from "@/components/Product/ProductInfo";

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
  const clientProduct = {
    ...product,

    dealerPrice: Number(product.dealerPrice),

    markupPercent: Number(product.markupPercent),

    sellingPrice: Number(product.sellingPrice),

    compareAtPrice: product.compareAtPrice
      ? Number(product.compareAtPrice)
      : null,

    discountPercent: product.discountPercent
      ? Number(product.discountPercent)
      : null,

    rating: Number(product.rating),

    variants: product.variants.map((variant) => ({
      ...variant,
      price: Number(variant.price),
    })),
  };
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

      variants: {
        where: {
          isDefault: true,
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

        <ProductInfo product={clientProduct} />
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