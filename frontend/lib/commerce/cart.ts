import type { PrismaClient } from "@/lib/generated/prisma/client";

import { AppError, ErrorCodes } from "@/lib/errors";

type Db = PrismaClient;

export async function findOrCreateCart(
  db: Db,
  identity: { userId?: string | null; sessionId?: string | null }
) {
  if (identity.userId) {
    const existing = await db.cart.findFirst({
      where: { userId: identity.userId },
    });
    if (existing) return existing;
    return db.cart.create({
      data: { userId: identity.userId },
    });
  }

  if (!identity.sessionId) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "A cart session is required.",
      400
    );
  }

  const existing = await db.cart.findFirst({
    where: { sessionId: identity.sessionId },
  });
  if (existing) return existing;
  return db.cart.create({
    data: { sessionId: identity.sessionId },
  });
}

export async function getCartRecord(
  db: Db,
  identity: { userId?: string | null; sessionId?: string | null }
) {
  return db.cart.findFirst({
    where: {
      OR: [
        ...(identity.userId ? [{ userId: identity.userId }] : []),
        ...(identity.sessionId ? [{ sessionId: identity.sessionId }] : []),
      ],
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              inventory: true,
              product: {
                include: {
                  images: {
                    orderBy: { sortOrder: "asc" },
                    take: 1,
                  },
                  wishlistItems: identity.userId
                    ? { where: { userId: identity.userId } }
                    : false,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function addCartItem(
  db: Db,
  identity: { userId?: string | null; sessionId?: string | null },
  variantId: string,
  quantity: number
) {
  if (!variantId || quantity <= 0) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid cart request.",
      400
    );
  }

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: true },
  });

  if (!variant || !variant.product.isActive || !variant.product.isPublished) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Product is unavailable.", 404);
  }

  const cart = await findOrCreateCart(db, identity);
  const existing = await db.cartItem.findUnique({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId,
      },
    },
  });

  if (existing) {
    return db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  }

  return db.cartItem.create({
    data: {
      cartId: cart.id,
      variantId,
      quantity,
    },
  });
}

export async function updateCartItemQuantity(
  db: Db,
  identity: { userId?: string | null; sessionId?: string | null },
  cartItemId: string,
  quantity: number
) {
  const cart = await getCartRecord(db, identity);
  if (!cart) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Cart not found.", 404);
  }

  const item = cart.items.find((entry) => entry.id === cartItemId);
  if (!item) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Cart item not found.", 404);
  }

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: cartItemId } });
    return null;
  }

  return db.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
}

export async function removeCartItem(
  db: Db,
  identity: { userId?: string | null; sessionId?: string | null },
  cartItemId: string
) {
  const cart = await getCartRecord(db, identity);
  if (!cart) return;
  const item = cart.items.find((entry) => entry.id === cartItemId);
  if (!item) return;
  await db.cartItem.delete({ where: { id: cartItemId } });
}

export async function clearCart(db: Db, cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
}
