import Image from "next/image";
import QuantitySelector from "./QuantitySelector";

type Props = {
  item: {
    id: string;
    quantity: number;
    variant: {
      color: string;
      size: string;
      price: any;
      product: {
        name: string;
        images: {
          imageUrl: string;
        }[];
      };
    };
  };
};

export default function CartItem({ item }: Props) {
  return (
    <div className="flex gap-6 rounded-2xl border p-5">

      <Image
        src={item.variant.product.images[0].imageUrl}
        alt={item.variant.product.name}
        width={140}
        height={180}
        className="rounded-xl object-cover"
      />

      <div className="flex flex-1 flex-col">

        <h2 className="text-xl font-semibold">
          {item.variant.product.name}
        </h2>

        <p className="mt-2 text-gray-500">
          {item.variant.color} • {item.variant.size}
        </p>

        <p className="mt-4 text-2xl font-bold">
          ₹{Number(item.variant.price).toLocaleString()}
        </p>

        <div className="mt-auto">
        <QuantitySelector
            cartItemId={item.id}
            quantity={item.quantity}
        />
        </div>

      </div>

    </div>
  );
}