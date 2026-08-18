"use client";

import { useState, useTransition } from "react";

import AddressSelector from "./AddressSelector";
import { placeOrder } from "@/lib/actions/order";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type Props = {
  addresses: Address[];
};

export default function CheckoutClient({
  addresses,
}: Props) {
  const [selectedAddressId, setSelectedAddressId] =
    useState(
      addresses.find((a) => a.isDefault)?.id ??
        addresses[0]?.id ??
        ""
    );
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <AddressSelector
        addresses={addresses}
        selectedAddressId={selectedAddressId}
        onSelect={setSelectedAddressId}
      />

      <label className="block text-sm font-medium">
        Coupon
        <input
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value)}
          className="mt-2 w-full rounded-xl border px-4 py-3"
          placeholder="Optional code"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={!selectedAddressId || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await placeOrder(
                selectedAddressId,
                couponCode || undefined
              );
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Checkout failed."
              );
            }
          });
        }}
        className="w-full rounded-xl bg-black py-4 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Creating order..." : "Continue to Payment"}
      </button>
    </div>
  );
}
