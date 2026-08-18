import type { PrismaClient } from "@/lib/generated/prisma/client";

import { AppError, ErrorCodes } from "@/lib/errors";
import { calculateDiscount } from "@/lib/commerce/money";

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function applyCoupon(db: Db, code: string | undefined, subtotal: number) {
  if (!code) {
    return { coupon: null, discountAmount: 0 };
  }

  const coupon = await db.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError(ErrorCodes.COUPON_INVALID, "This coupon is not valid.", 400);
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new AppError(ErrorCodes.COUPON_INVALID, "This coupon is not valid yet.", 400);
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new AppError(ErrorCodes.COUPON_INVALID, "This coupon has expired.", 400);
  }
  if (Number(coupon.minOrder) > subtotal) {
    throw new AppError(
      ErrorCodes.COUPON_INVALID,
      "This coupon does not meet the minimum order value.",
      400
    );
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError(ErrorCodes.COUPON_INVALID, "This coupon has been fully used.", 400);
  }

  return {
    coupon,
    discountAmount: calculateDiscount({
      type: coupon.type,
      value: Number(coupon.value),
      subtotal,
    }),
  };
}
