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
  const savedProduct =
    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      update: {
        name: product.name,
        description: product.description,
        categoryId:
          categories[product.category],
        brandId:
          brands[product.brand],
        gender: product.gender,
        dealerPrice:
          pricing.dealerPrice,
        markupPercent:
          pricing.markupPercent,
        sellingPrice:
          pricing.sellingPrice,
        compareAtPrice:
          pricing.compareAtPrice,
        discountPercent:
          pricing.discountPercent,
        rating: product.rating,
        reviewCount: product.reviewCount,
        isPublished: true,
        isFeatured: product.featured,
        isTrending: product.trending,
        isActive: true,
      },
      create: {
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
      },
    });

  await prisma.productImage.deleteMany({
    where: {
      productId: savedProduct.id,
    },
  });

  await prisma.productImage.createMany({
    data: createProductImages(
      product.slug,
      product.images
    ).map((image) => ({
      ...image,
      productId: savedProduct.id,
    })),
  });

  const variants =
    product.colors.flatMap((color, colorIndex) =>
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
        })
      )
    );

  for (const variant of variants) {
    const savedVariant =
      await prisma.productVariant.upsert({
        where: {
          sku: variant.sku,
        },
        update: {
          productId: savedProduct.id,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          isDefault:
            variant.isDefault,
        },
        create: {
          productId: savedProduct.id,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          sku: variant.sku,
          isDefault:
            variant.isDefault,
        },
      });

    await prisma.inventory.upsert({
      where: {
        variantId: savedVariant.id,
      },
      update: {
        quantity: 20,
        reserved: 0,
      },
      create: {
        variantId: savedVariant.id,
        quantity: 20,
        reserved: 0,
      },
    });
  }

  await prisma.productVariant.updateMany({
    where: {
      productId: savedProduct.id,
      sku: {
        notIn: variants.map(
          (variant) => variant.sku
        ),
      },
    },
    data: {
      isDefault: false,
    },
  });
}