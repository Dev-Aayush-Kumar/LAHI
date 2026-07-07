import Link from "next/link";

import { createAddress } from "@/lib/actions/address";

export default function NewAddressPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-bold">
            Add New Address
          </h1>

          <p className="mt-2 text-gray-500">
            Save a delivery address for faster checkout.
          </p>

        </div>

        <Link
          href="/profile/addresses"
          className="
            rounded-xl
            border
            px-5
            py-3
            font-medium
            transition
            hover:bg-gray-100
          "
        >
          Back
        </Link>

      </div>

      <form
        action={createAddress}
        className="space-y-6 rounded-2xl border p-8 shadow-sm"
      >

        <div className="grid gap-6 md:grid-cols-2">

          <div>

            <label className="mb-2 block font-medium">
              Full Name
            </label>

            <input
              name="fullName"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block font-medium">
              Phone Number
            </label>

            <input
              name="phone"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

          </div>

        </div>

        <div>

          <label className="mb-2 block font-medium">
            Address Line 1
          </label>

          <input
            name="addressLine1"
            required
            className="w-full rounded-xl border px-4 py-3"
          />

        </div>

        <div>

          <label className="mb-2 block font-medium">
            Address Line 2 (Optional)
          </label>

          <input
            name="addressLine2"
            className="w-full rounded-xl border px-4 py-3"
          />

        </div>

        <div className="grid gap-6 md:grid-cols-2">

          <div>

            <label className="mb-2 block font-medium">
              City
            </label>

            <input
              name="city"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block font-medium">
              State
            </label>

            <input
              name="state"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

          </div>

        </div>

        <div className="grid gap-6 md:grid-cols-2">

          <div>

            <label className="mb-2 block font-medium">
              Postal Code
            </label>

            <input
              name="postalCode"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block font-medium">
              Country
            </label>

            <input
              name="country"
              defaultValue="India"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

          </div>

        </div>

        <label className="flex items-center gap-3">

          <input
            type="checkbox"
            name="isDefault"
            className="h-5 w-5"
          />

          <span>
            Make this my default address
          </span>

        </label>

        <button
          type="submit"
          className="
            rounded-xl
            bg-black
            px-8
            py-4
            font-semibold
            text-white
            transition
            hover:bg-gray-800
          "
        >
          Save Address
        </button>

      </form>

    </main>
  );
}