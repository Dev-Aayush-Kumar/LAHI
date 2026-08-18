import "dotenv/config";
import { prisma } from "../lib/prisma";

async function cleanupStaleSmokeData() {
  const staleUsers =
    await prisma.user.findMany({
      where: {
        email: {
          startsWith: "stabilization-",
        },
      },
      select: {
        id: true,
      },
    });

  const staleUserIds = staleUsers.map(
    (user) => user.id
  );

  if (staleUserIds.length > 0) {
    await prisma.order.deleteMany({
      where: {
        userId: {
          in: staleUserIds,
        },
      },
    });

    await prisma.cart.deleteMany({
      where: {
        OR: [
          {
            userId: {
              in: staleUserIds,
            },
          },
          {
            sessionId: {
              startsWith:
                "stabilization-session-",
            },
          },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: staleUserIds,
        },
      },
    });
  }

  await prisma.category.deleteMany({
    where: {
      slug: {
        startsWith: "stabilization-temp-",
      },
    },
  });
}

async function main() {
  await cleanupStaleSmokeData();

  const userCount = await prisma.user.count();
  const categoryCount = await prisma.category.count();
  const brandCount = await prisma.brand.count();
  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const cartCount = await prisma.cart.count();
  const modelCount = await prisma.userModel.count();
  const tryOnJobCount = await prisma.tryOnJob.count();

  console.log(
    JSON.stringify(
      {
        userCount,
        categoryCount,
        brandCount,
        productCount,
        variantCount,
        cartCount,
        modelCount,
        tryOnJobCount,
      },
      null,
      2
    )
  );

  const marker = Date.now();
  const tempEmail = `stabilization-${marker}@example.com`;
  const orderNumber = `STAB-${marker}`;
  const tempSession = `stabilization-session-${marker}`;
  const created = await prisma.category.create({
    data: {
      name: `Stabilization Temp ${marker}`,
      slug: `stabilization-temp-${marker}`,
    },
  });

  await prisma.category.delete({
    where: {
      id: created.id,
    },
  });

  console.log("writeDeleteCheck", "ok");

  const variant =
    await prisma.productVariant.findFirst({
      include: {
        product: true,
      },
    });

  if (!variant) {
    throw new Error(
      "No product variant found for extended smoke tests."
    );
  }

  const user = await prisma.user.create({
    data: {
      fullName: "Stabilization User",
      email: tempEmail,
      passwordHash: "dev-smoke-hash",
    },
  });

  const cart = await prisma.cart.create({
    data: {
      userId: user.id,
      sessionId: tempSession,
    },
  });

  try {
    await prisma.address.create({
      data: {
        userId: user.id,
        fullName: "Stabilization User",
        phone: "9999999999",
        addressLine1: "Line 1",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
        isDefault: true,
      },
    });

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        productId: variant.product.id,
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        subtotal: variant.price,
        shipping: 0,
        tax: 0,
        totalAmount: variant.price,
        paymentMethod: "COD",
        fullName: "Stabilization User",
        phone: "9999999999",
        addressLine1: "Line 1",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: variant.product.id,
        variantId: variant.id,
        productName: variant.product.name,
        color: variant.color,
        size: variant.size,
        quantity: 1,
        price: variant.price,
      },
    });

    const userModel =
      await prisma.userModel.create({
        data: {
          userId: user.id,
          name: "Smoke Model",
          relation: "Self",
          status: "READY",
        },
      });

    const tryOnJob =
      await prisma.tryOnJob.create({
        data: {
          userId: user.id,
          modelId: userModel.id,
          productId: variant.product.id,
          status: "COMPLETED",
          progress: 100,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

    await prisma.tryOnResult.create({
      data: {
        jobId: tryOnJob.id,
        generatedImageUrl:
          "/uploads/generated/smoke.png",
        modelName: "smoke",
        generationTimeMs: 1,
      },
    });

    console.log("domainWriteChecks", "ok");
  } finally {
    await prisma.order.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await prisma.cart.delete({
      where: {
        id: cart.id,
      },
    });

    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("db-smoke failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
