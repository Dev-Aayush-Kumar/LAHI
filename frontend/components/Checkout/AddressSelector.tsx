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
  selectedAddressId: string;
  onSelect: (id: string) => void;
};

export default function AddressSelector({
  addresses,
  selectedAddressId,
  onSelect,
}: Props) {
  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <label
          key={address.id}
          className="flex cursor-pointer gap-4 rounded-xl border p-4"
        >
          <input
          type="radio"
          name="address"
          checked={selectedAddressId === address.id}
          onChange={() => onSelect(address.id)}
          />

          <div>
            <p className="font-semibold">
              {address.fullName}
            </p>

            <p>{address.phone}</p>

            <p>{address.addressLine1}</p>

            {address.addressLine2 && (
              <p>{address.addressLine2}</p>
            )}

            <p>
              {address.city}, {address.state}
            </p>

            <p>{address.postalCode}</p>

            <p>{address.country}</p>
          </div>
        </label>
      ))}
    </div>
  );
}