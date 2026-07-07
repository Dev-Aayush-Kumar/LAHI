import CartItem from "@/components/Cart/CartItem";
import { getCart } from "@/lib/actions/cart";

export default async function CartPage() {
  const cartData = await getCart();
  console.log("CART DATA:", cartData);
  const cart = cartData?.cart;
  const subtotal = cartData?.subtotal ?? 0;
  const shipping = cartData?.shipping ?? 0;
  const tax = cartData?.tax ?? 0;
  const total = cartData?.total ?? 0;
  const transformedCart = cart
    ? {
        ...cart,
        items: cart.items.map((item) => ({
          ...item,
          variant: {
            ...item.variant,
            product: {
              ...item.variant.product,
              isWishlisted:
                item.variant.product.wishlistItems.length >
                0,
            },
          },
        })),
      }
    : null;
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      <h1 className="mb-10 text-4xl font-bold">
        Shopping Cart
      </h1>

      {!cart || cart.items.length === 0 ? (

        <div className="flex flex-col items-center justify-center py-24">

          <div className="text-8xl">
            🛒
          </div>

          <h2 className="mt-8 text-4xl font-bold">
            Your cart is empty
          </h2>

          <p className="mt-4 text-lg text-gray-500">
            Looks like you haven't added anything yet.
          </p>

          <a
            href="/"
            className="mt-10 rounded-xl bg-black px-8 py-4 font-semibold text-white transition hover:bg-gray-800"
          >
            Continue Shopping
          </a>

        </div>

      ) : (
        <div className="grid gap-10 lg:grid-cols-3">

          <div className="space-y-6 lg:col-span-2">

            {cart!.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
              />
            ))}

          </div>

          <aside className="rounded-2xl border p-6 h-fit">

            <h2 className="mb-6 text-2xl font-bold">
              Order Summary
            </h2>

            <div className="space-y-4">

              <div className="flex justify-between">

                <span>Subtotal</span>

                <span>
                  ₹{subtotal.toLocaleString()}
                </span>

              </div>

              <div className="flex justify-between">

                <span>Shipping</span>

                <span>
                  {shipping === 0
                    ? "FREE"
                    : `₹${shipping}`}
                </span>

              </div>

              <div className="flex justify-between">

                <span>GST (18%)</span>

                <span>
                  ₹{tax.toLocaleString()}
                </span>

              </div>

              <hr />

              <div className="flex justify-between text-xl font-bold">

                <span>Total</span>

                <span>
                  ₹{total.toLocaleString()}
                </span>

              </div>

            </div>

            <button
              className="mt-8 w-full rounded-xl bg-black py-4 font-semibold text-white transition hover:bg-gray-800"
            >
              Proceed to Checkout
            </button>

          </aside>

        </div>
      )}

    </main>
  );
}