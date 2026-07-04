"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { moveCartItemToWishlist } from "@/lib/actions/wishlist";

type Props = {
  cartItemId: string;
};

export default function MoveToWishlistButton({
  cartItemId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] =
    useTransition();

  function handleClick() {
    startTransition(async () => {
      const result =
        await moveCartItemToWishlist(cartItemId);

      if (result.requiresLogin) {
        router.push(
          `/login?redirect=${encodeURIComponent(
            pathname
          )}`
        );
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="
        rounded-xl
        border
        border-pink-300
        px-5
        py-2
        font-medium
        text-pink-600
        transition
        hover:bg-pink-600
        hover:text-white
        active:scale-95
        disabled:opacity-50
      "
    >
      ❤️ Move to Wishlist
    </button>
  );
}