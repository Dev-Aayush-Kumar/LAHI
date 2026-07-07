type Props = {
  address: {
    id: string;
    fullName: string;
  };
};

export default function AddressCard({
  address,
}: Props) {
  return (
    <div className="rounded-2xl border p-6">
      <h2 className="font-semibold">
        {address.fullName}
      </h2>
    </div>
  );
}