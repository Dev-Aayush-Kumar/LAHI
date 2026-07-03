import ProductCardImage from "@/components/Product/ProductCardImage";
import Button from "@/components/Shared/Button";
import Card from "@/components/Shared/Card";
import { addToCart } from "@/actions/cart";
import AddToCartButton from "../AddToCartButton";
import WishlistButton from "./WishlistButton";

type ProductCardProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    sellingPrice: any;
    compareAtPrice: any | null;

    brand: {
      name: string;
    };

    images: {
      imageUrl: string;
    }[];

    variants: {
      id: string;
    }[];

    isWishlisted: boolean;
  };
};
export default function ProductCard({
  product,
}: ProductCardProps) {
  const defaultVariant = product.variants.at(0);

  if (!defaultVariant) {
    return null;
  }
  const sellingPrice = Number(product.sellingPrice);

  const compareAtPrice = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;

  const discount =
    compareAtPrice && compareAtPrice > sellingPrice
      ? Math.round(
          ((compareAtPrice - sellingPrice) /
            compareAtPrice) *
            100
        )
      : 0;

  return (
    <Card className="overflow-hidden">

      <div className="relative">

        <ProductCardImage
          slug={product.slug}
          images={product.images}
          productName={product.name}
        />

        <WishlistButton
          productId={product.id}
          isWishlisted={product.isWishlisted}
        />

      </div>
      <div className="p-6">

        <p className="text-sm text-gray-500">
          {product.brand.name}
        </p>

        <h3 className="mt-1 text-xl font-semibold">
          {product.name}
        </h3>

        <div className="mt-4 flex items-center gap-3">

          <span className="text-xl font-bold">
            ₹{sellingPrice.toLocaleString()}
          </span>

          {compareAtPrice && (
            <>
              <span className="text-gray-400 line-through">
                ₹{compareAtPrice.toLocaleString()}
              </span>

              <span className="text-green-600">
                {discount}% OFF
              </span>
            </>
          )}

        </div>

        <div className="mt-6">
          <Button>
            Try It On
          </Button>
        </div>

        <div className="mt-3">

          <form action={addToCart}>

            <input
              type="hidden"
              name="variantId"
              value={defaultVariant.id}
            />

            <input
              type="hidden"
              name="quantity"
              value="1"
            />

            <AddToCartButton />

          </form>

        </div>

      </div>

    </Card>
  );
}