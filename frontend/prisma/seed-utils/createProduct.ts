import { calculatePricing } from "../../lib/pricing";
import { PrismaClient } from "../../lib/generated/prisma/client";

function createProductImages(
  slug: string,
  imageNames: readonly string[]
) {
  return imageNames.map((imageName, index) => ({
    imageUrl: `/products/${slug}/${imageName}.jpg`,
    sortOrder: index + 1,
  }));
}

function createSku(
  slug: string,
  color: string,
  size: string
) {
  return `${slug}-${color}-${size}`
    .replaceAll("_", "-")
    .toUpperCase();
}

type ProductDefinition = {
  name: string;
  slug: string;
  description: string;

  category: string;
  brand: string;
  gender: string;

  dealerPrice: number;

  rating: number;
  reviewCount: number;

  featured: boolean;
  trending: boolean;

  colors: readonly string[];

  sizes: readonly string[];

  images: readonly string[];
};

export async function createProduct(
  prisma: PrismaClient,

  product: ProductDefinition,

  categories: Record<string, string>,

  brands: Record<string, string>
) {
  const pricing = calculatePricing(
    product.dealerPrice
  );

  await prisma.product.create({

    data: {

      name: product.name,

      slug: product.slug,

      description: product.description,

      categoryId:
        categories[product.category],

      brandId:
        brands[product.brand],

      gender: product.gender,

      ...pricing,

      rating: product.rating,

      reviewCount: product.reviewCount,

      isPublished: true,

      isFeatured: product.featured,

      isTrending: product.trending,

      isActive: true,

      images: {

        create: createProductImages(
          product.slug,
          product.images
        ),

      },

      variants: {

        create: product.colors.flatMap(
          (color, colorIndex) =>

            product.sizes.map(
              (size, sizeIndex) => ({

                color,

                size,

                price: pricing.sellingPrice,

                sku: createSku(
                  product.slug,
                  color,
                  size
                ),

                isDefault:
                  colorIndex === 0 &&
                  sizeIndex === 0,

                inventory: {

                  create: {

                    quantity: 20,

                    reserved: 0,

                  },

                },

              })
            )
        ),

      },

    },

  });
}