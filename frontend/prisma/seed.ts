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
  const resetCatalog =
    process.env.SEED_RESET_CATALOG === "true";

  if (resetCatalog) {
    console.log(
      "Reset mode enabled: cleaning catalog tables..."
    );

    await prisma.inventory.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.category.deleteMany();
  } else {
    console.log(
      "Safe mode: preserving existing catalog rows and upserting seed data."
    );
  }

  console.log("Creating categories...");

  const categoryMap: Record<string, string> = {};

  for (const category of CATEGORIES) {
    const saved = await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
        imageUrl: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        imageUrl: null,
      },
    });
    categoryMap[category.slug] = saved.id;
  }

  console.log("Creating brands...");

  const brandMap: Record<string, string> = {};

  for (const brand of BRANDS) {
    const saved = await prisma.brand.upsert({
      where: {
        slug: brand.slug,
      },
      update: {
        name: brand.name,
        logoUrl: null,
      },
      create: {
        name: brand.name,
        slug: brand.slug,
        logoUrl: null,
      },
    });
    brandMap[brand.slug] = saved.id;
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

  await seedCommerceFixtures();

  console.log("");

  console.log("Seed completed successfully.");

}

async function seedCommerceFixtures() {
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: { isActive: true },
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      minOrder: 499,
      maxUses: 1000,
      isActive: true,
    },
  });

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (adminEmail && adminPassword) {
    const bcrypt = await import("bcrypt");
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN", passwordHash },
      create: {
        fullName: "LAHI Admin",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Admin bootstrap ready for ${adminEmail}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });