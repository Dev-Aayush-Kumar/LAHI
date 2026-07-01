"use client";

import { useTransition } from "react";

import {
  increaseQuantity,
  decreaseQuantity,
} from "@/actions/cartQuantity";

type Props = {
  cartItemId: string;
  quantity: number;
};

export default function QuantitySelector({
  cartItemId,
  quantity,
}: Props) {
  const [isPending, startTransition] =
    useTransition();

  return (
    <div className="flex items-center gap-3">

      <button
        disabled={isPending}
        onClick={() =>
          startTransition(() =>
            decreaseQuantity(cartItemId)
          )
        }
        className="h-10 w-10 rounded-lg border text-xl"
      >
        −
      </button>

      <span className="w-8 text-center font-semibold">
        {quantity}
      </span>

      <button
        disabled={isPending}
        onClick={() =>
          startTransition(() =>
            increaseQuantity(cartItemId)
          )
        }
        className="h-10 w-10 rounded-lg border text-xl"
      >
        +
      </button>

    </div>
  );
}