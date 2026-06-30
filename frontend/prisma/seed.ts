import "dotenv/config";

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { BRANDS } from "./seed-data/brands";
import { CATEGORIES } from "./seed-data/categories";
import { PRODUCTS } from "./seed-data/products";

import { createProduct } from "./seed-utils/createProduct";

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

  const categoryMap: Record<string, string> = {};

  for (const category of CATEGORIES) {

    const created = await prisma.category.create({
      data: category,
    });

    categoryMap[category.slug] = created.id;
  }

  console.log("Creating brands...");

  const brandMap: Record<string, string> = {};

  for (const brand of BRANDS) {

    const created = await prisma.brand.create({
      data: brand,
    });

    brandMap[brand.slug] = created.id;
  }

  console.log("Creating products...");

  for (const product of PRODUCTS) {

    await createProduct(

      prisma,

      product,

      categoryMap,

      brandMap

    );

    console.log(`✔ ${product.name}`);

  }

  console.log("");

  console.log("Seed completed successfully.");

}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });