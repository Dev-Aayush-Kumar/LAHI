"use client";

import { useMemo, useState } from "react";
import { addToCart } from "@/actions/cart";
import WishlistButton from "@/components/Product/ProductCard/WishlistButton";

type Variant = {
  id: string;
  color: string;
  size: string;
  price: number;
  isDefault: boolean;
};

type Props = {
  product: {
    id: string;
    name: string;
    sellingPrice: number;
    compareAtPrice: number | null;
    description: string;
    isWishlisted: boolean;

    brand: {
      name: string;
    };

    variants: Variant[];
  };
};

export default function ProductInfo({
  product,
}: Props) {
  const defaultVariant =
    product.variants.find((v) => v.isDefault) ??
    product.variants[0];

  const [selectedColor, setSelectedColor] =
    useState(defaultVariant.color);

  const [selectedSize, setSelectedSize] =
    useState(defaultVariant.size);

  const [quantity, setQuantity] =
    useState(1);

  const colors = [
    ...new Set(
      product.variants.map(
        (variant) => variant.color
      )
    ),
  ];

  const sizes = useMemo(() => {
    return product.variants
      .filter(
        (variant) =>
          variant.color === selectedColor
      )
      .map((variant) => variant.size);
  }, [product.variants, selectedColor]);

  const selectedVariant = useMemo(() => {
    return product.variants.find(
      (variant) =>
        variant.color === selectedColor &&
        variant.size === selectedSize
    );
  }, [
    product.variants,
    selectedColor,
    selectedSize,
  ]);

  return (
    <section>

      <div className="flex items-start justify-between gap-6">

        <div>

          <p className="text-lg text-gray-500">
            {product.brand.name}
          </p>

          <h1 className="mt-2 text-5xl font-bold">
            {product.name}
          </h1>

        </div>

        <WishlistButton
          productId={product.id}
          initialWishlisted={product.isWishlisted}
        />

      </div>

      <div className="mt-6 flex items-center gap-4">

        <span className="text-4xl font-bold">
          ₹{Number(
            selectedVariant?.price ??
              product.sellingPrice
          ).toLocaleString()}
        </span>

        {product.compareAtPrice && (
          <span className="text-2xl text-gray-400 line-through">
            ₹{Number(
              product.compareAtPrice
            ).toLocaleString()}
          </span>
        )}

      </div>

      {/* COLORS */}

      <div className="mt-10">

        <h3 className="mb-3 font-semibold">
          Colors
        </h3>

        <div className="flex flex-wrap gap-3">

          {colors.map((color) => (

            <button
              key={color}
              type="button"
              onClick={() => {
                setSelectedColor(color);

                const firstVariant =
                  product.variants.find(
                    (variant) =>
                      variant.color === color
                  );

                if (firstVariant) {
                  setSelectedSize(
                    firstVariant.size
                  );
                }
              }}
              className={`rounded-xl border px-5 py-3 transition ${
                selectedColor === color
                  ? "border-black bg-black text-white"
                  : ""
              }`}
            >
              {color}
            </button>

          ))}

        </div>

      </div>

      {/* SIZES */}

      <div className="mt-10">

        <h3 className="mb-3 font-semibold">
          Sizes
        </h3>

        <div className="flex flex-wrap gap-3">

          {sizes.map((size) => (

            <button
              key={size}
              type="button"
              onClick={() =>
                setSelectedSize(size)
              }
              className={`rounded-xl border px-5 py-3 transition ${
                selectedSize === size
                  ? "border-black bg-black text-white"
                  : ""
              }`}
            >
              {size}
            </button>

          ))}

        </div>

      </div>

      {/* QUANTITY */}

      <div className="mt-10">

        <h3 className="mb-3 font-semibold">
          Quantity
        </h3>

        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) =>
            setQuantity(
              Math.max(
                1,
                Number(e.target.value)
              )
            )
          }
          className="w-24 rounded-xl border px-4 py-3"
        />

      </div>

      {/* BUTTONS */}

      <div className="mt-10">

        <form action={addToCart}>

          <input
            type="hidden"
            name="variantId"
            value={selectedVariant?.id ?? ""}
          />

          <input
            type="hidden"
            name="quantity"
            value={quantity}
          />

          <button
            className="rounded-xl bg-black px-8 py-4 font-semibold text-white transition hover:opacity-80 active:scale-95"
          >
            Add to Cart
          </button>

        </form>

      </div>

    </section>
  );
}