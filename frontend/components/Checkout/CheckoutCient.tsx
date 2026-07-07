"use client";

import { useState } from "react";

import AddressSelector from "./AddressSelector";

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

  return (
    <AddressSelector
      addresses={addresses}
      selectedAddressId={selectedAddressId}
      onSelect={setSelectedAddressId}
    />
  );
}