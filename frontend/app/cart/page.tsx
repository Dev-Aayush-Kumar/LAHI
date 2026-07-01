import { prisma } from "@/lib/prisma";
import { getCartSessionId } from "@/lib/cart";
import CartItem from "@/components/Cart/CartItem";

export default async function CartPage() {
  const sessionId = await getCartSessionId();

  const cart = await prisma.cart.findFirst({
    where: {
      sessionId,
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
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      <h1 className="mb-10 text-4xl font-bold">
        Shopping Cart
      </h1>

      {!cart || cart.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="space-y-6">
          {cart.items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
            />
          ))}
        </div>
      )}

    </main>
  );
}