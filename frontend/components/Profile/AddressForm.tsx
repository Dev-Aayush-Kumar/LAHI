"use client";

import { createAddress } from "@/lib/actions/address";

export default function AddressForm() {
  return (
    <form
      action={createAddress}
      className="mt-10 space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">
            Full Name
          </label>

          <input
            name="fullName"
            required
            className="w-full rounded-xl border p-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Phone Number
          </label>

          <input
            name="phone"
            required
            className="w-full rounded-xl border p-3"
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
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Address Line 2 (Optional)
        </label>

        <input
          name="addressLine2"
          className="w-full rounded-xl border p-3"
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
            className="w-full rounded-xl border p-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            State
          </label>

          <input
            name="state"
            required
            className="w-full rounded-xl border p-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Postal Code
          </label>

          <input
            name="postalCode"
            required
            className="w-full rounded-xl border p-3"
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
            className="w-full rounded-xl border p-3"
          />
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="isDefault"
        />

        <span>Make this my default address</span>
      </label>

      <button
        type="submit"
        className="
          rounded-xl
          bg-black
          px-8
          py-3
          font-semibold
          text-white
          transition
          hover:bg-gray-800
        "
      >
        Save Address
      </button>
    </form>
  );
}