import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";

export async function getCartItemCount() {
  const user = await getCurrentUser();
  const sessionId = await getCartSessionId();

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
      items: true,
    },
  });

  if (!cart) {
    return 0;
  }

  return cart.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
}