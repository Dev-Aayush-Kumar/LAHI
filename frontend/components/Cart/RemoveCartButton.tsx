"use client";

import { useTransition } from "react";
import { removeCartItem } from "@/actions/cart";

type Props = {
  cartItemId: string;
};

export default function RemoveCartButton({
  cartItemId,
}: Props) {
  const [isPending, startTransition] =
    useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() =>
          removeCartItem(cartItemId)
        )
      }
      className="
        rounded-xl
        border
        border-red-300
        px-5
        py-2
        font-medium
        text-red-600
        transition
        hover:bg-red-600
        hover:text-white
        active:scale-95
        disabled:opacity-50
      "
    >
      🗑 Remove
    </button>
  );
}