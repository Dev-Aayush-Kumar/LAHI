import type { PrismaClient } from "@/lib/generated/prisma/client";

import { AppError, ErrorCodes } from "@/lib/errors";

export async function upsertReview(
  db: PrismaClient,
  input: {
    userId: string;
    productId: string;
    rating: number;
    title?: string;
    body?: string;
  }
) {
  if (input.rating < 1 || input.rating > 5) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Rating must be between 1 and 5.",
      400
    );
  }

  const purchased = await db.orderItem.findFirst({
    where: {
      productId: input.productId,
      order: {
        userId: input.userId,
        paymentStatus: "PAID",
      },
    },
  });

  if (!purchased) {
    throw new AppError(
      ErrorCodes.FORBIDDEN,
      "Reviews are available after a completed purchase.",
      403
    );
  }

  const review = await db.review.upsert({
    where: {
      userId_productId: {
        userId: input.userId,
        productId: input.productId,
      },
    },
    update: {
      rating: input.rating,
      title: input.title,
      body: input.body,
    },
    create: input,
  });

  const aggregate = await db.review.aggregate({
    where: { productId: input.productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await db.product.update({
    where: { id: input.productId },
    data: {
      rating: aggregate._avg.rating ?? input.rating,
      reviewCount: aggregate._count.rating,
    },
  });

  return review;
}
