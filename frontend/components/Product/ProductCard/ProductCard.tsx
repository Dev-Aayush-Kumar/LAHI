import Button from "@/components/Shared/Button";
import Card from "@/components/Shared/Card";
import { Product } from "@/types/product";

export default function ProductCard({
  brand,
  name,
  price,
  originalPrice,
  rating,
}: Product) {
  const discount = Math.round(
    ((originalPrice - price) / originalPrice) * 100
  );

  return (
    <Card className="overflow-hidden">
      <div className="relative flex h-72 items-center justify-center rounded-t-3xl bg-gradient-to-br from-gray-100 via-white to-gray-200">
        <div className="text-center">
          <div className="text-7xl">👕</div>
          <p className="mt-4 text-sm font-medium text-gray-500">
            Product Image
          </p>
      </div>

      <button
        className="absolute right-4 top-4 rounded-full bg-white p-2 shadow-md transition-all duration-300 hover:scale-110"
      >
       ♡
      </button>

</div>

      <div className="p-6">
        <p className="text-sm text-gray-500">
          {brand}
        </p>

        <h3 className="mt-1 text-xl font-semibold">
          {name}
        </h3>

        <p className="mt-2 text-sm">
          ⭐ {rating}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xl font-bold">
            ₹{price.toLocaleString()}
          </span>

          <span className="text-gray-400 line-through">
            ₹{originalPrice.toLocaleString()}
          </span>

          <span className="text-green-600">
            {discount}% OFF
          </span>
        </div>

        <div className="mt-6">
          <Button>
            Try It On
          </Button>
        </div>

        <div className="mt-3">
          <Button variant="secondary">
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}