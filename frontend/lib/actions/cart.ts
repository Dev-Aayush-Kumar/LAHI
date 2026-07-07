import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";

export async function getCart() {
  const sessionId = await getCartSessionId();
  console.log("Guest Session ID:", sessionId);
  const user = await getCurrentUser();
  const cart = await prisma.cart.findFirst({
    where: {
      OR: [
        ...(user
          ? [
              {
                userId: user.userId,
              },
            ]
          : []),
        ...(sessionId
          ? [
              {
                sessionId,
              },
            ]
          : []),
      ],
    },

    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: {
                      sortOrder: "asc",
                    },
                    take: 1,
                  },
                  wishlistItems: true,
                },
              },
            },
          },
        },
      },
    },
  });

console.log("SESSION ID:", sessionId);
console.log("USER:", user);
console.log("FOUND CART:", cart?.id);
console.log("ITEM COUNT:", cart?.items.length);

  if (!cart) {
    return null;
  }

  const subtotal = cart.items.reduce(
    (total, item) =>
      total +
      Number(item.variant.price) * item.quantity,
    0
  );

  const shipping = subtotal > 999 ? 0 : 99;

  const tax = Math.round(subtotal * 0.18);

  const total = subtotal + shipping + tax;

  const transformedCart = {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      variant: {
        ...item.variant,
        price: Number(item.variant.price),
        product: {
          ...item.variant.product,
          dealerPrice: Number(
            item.variant.product.dealerPrice
          ),
          markupPercent: Number(
            item.variant.product.markupPercent
          ),
          sellingPrice: Number(
            item.variant.product.sellingPrice
          ),
          compareAtPrice:
            item.variant.product.compareAtPrice
              ? Number(
                  item.variant.product.compareAtPrice
                )
              : null,
          discountPercent:
            item.variant.product.discountPercent
              ? Number(
                  item.variant.product.discountPercent
                )
              : null,
          rating: Number(item.variant.product.rating),
          isWishlisted:
            item.variant.product.wishlistItems.length > 0,
        },
      },
    })),
  };

  return {
    cart: transformedCart,
    subtotal,
    shipping,
    tax,
    total,
  };
}