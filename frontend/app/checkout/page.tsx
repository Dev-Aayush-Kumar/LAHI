import { redirect } from "next/navigation";
import { getCart } from "@/lib/actions/cart";
import { getAddresses } from "@/lib/actions/address";

import CartItem from "@/components/Cart/CartItem";
import CheckoutClient from "@/components/Checkout/CheckoutCient";

export default async function CheckoutPage() {
  const cartData = await getCart();

  if (!cartData || cartData.cart.items.length === 0) {
    redirect("/cart");
  }

  const addresses = await getAddresses();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      <h1 className="mb-10 text-4xl font-bold">
        Checkout
      </h1>

      <div className="grid gap-10 lg:grid-cols-3">

        <div className="space-y-8 lg:col-span-2">

          <section className="rounded-2xl border p-6">

            <h2 className="mb-6 text-2xl font-bold">
              Delivery Address
            </h2>

            {addresses.length > 0 ? (
            <CheckoutClient
                addresses={addresses}
            />
            ) : (
            <div>

                <p className="text-gray-500">
                No address found.
                </p>

                <a
                href="/profile/addresses/new"
                className="
                    mt-4
                    inline-block
                    rounded-xl
                    bg-black
                    px-5
                    py-3
                    text-white
                "
                >
                Add Address
                </a>

            </div>
            )}
          </section>

          <section className="space-y-6">

            {cartData.cart.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
              />
            ))}

          </section>

        </div>

        <aside className="h-fit rounded-2xl border p-6">

          <h2 className="mb-6 text-2xl font-bold">
            Order Summary
          </h2>

          <div className="space-y-4">

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>
                ₹{cartData.subtotal.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Shipping</span>

              <span>
                {cartData.shipping === 0
                  ? "FREE"
                  : `₹${cartData.shipping}`}
              </span>
            </div>

            <div className="flex justify-between">
              <span>GST</span>

              <span>
                ₹{cartData.tax.toLocaleString()}
              </span>
            </div>

            <hr />

            <div className="flex justify-between text-xl font-bold">

              <span>Total</span>

              <span>
                ₹{cartData.total.toLocaleString()}
              </span>

            </div>

          </div>

          <button
            className="
              mt-8
              w-full
              rounded-xl
              bg-black
              py-4
              font-semibold
              text-white
              transition
              hover:bg-gray-800
            "
          >
            Continue to Payment
          </button>

        </aside>

      </div>

    </main>
  );
}