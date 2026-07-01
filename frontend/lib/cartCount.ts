import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";

export async function getCartItemCount() {
  const sessionId = await getCartSessionId();

  const cart = await prisma.cart.findFirst({
    where: {
      sessionId,
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