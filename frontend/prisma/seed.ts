import "dotenv/config";
import { calculatePricing } from "../lib/pricing";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});
async function main() {
  console.log("Cleaning database...");

  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();

  console.log("Creating categories...");

  const women = await prisma.category.create({
    data: {
      name: "Women",
      slug: "women",
    },
  });

  const men = await prisma.category.create({
    data: {
      name: "Men",
      slug: "men",
    },
  });

  const kids = await prisma.category.create({
    data: {
      name: "Kids",
      slug: "kids",
    },
  });

  console.log("Creating brands...");

  const zara = await prisma.brand.create({
    data: {
      name: "Zara",
      slug: "zara",
    },
  });

  const hnm = await prisma.brand.create({
    data: {
      name: "H&M",
      slug: "hm",
    },
  });

  const nike = await prisma.brand.create({
    data: {
      name: "Nike",
      slug: "nike",
    },
  });

  console.log("Creating first products...");

  await prisma.product.create({
    data: {
      name: "Oversized Cotton T-Shirt",
      slug: "oversized-cotton-tshirt",

      description:
        "Premium oversized cotton t-shirt with relaxed fit.",

      categoryId: men.id,
      brandId: hnm.id,
      ...calculatePricing(420),
      isPublished: true,
      isFeatured: true,
      isActive: true,
    },
  });

  await prisma.product.create({
    data: {
      name: "Women's Summer Dress",
      slug: "womens-summer-dress",

      description:
        "Elegant floral summer dress for casual outings.",

      categoryId: women.id,
      brandId: zara.id,
      ...calculatePricing(650),
      isPublished: true,
      isFeatured: true,
      isActive: true,
    },
  });

  await prisma.product.create({
    data: {
      name: "Nike Air Sneakers",
      slug: "nike-air-sneakers",

      description:
        "Lightweight everyday sneakers with premium comfort.",

      categoryId: men.id,
      brandId: nike.id,
      ...calculatePricing(900),
      isPublished: true,
      isFeatured: true,
      isActive: true,
    },
  });

  console.log("Seed completed.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });