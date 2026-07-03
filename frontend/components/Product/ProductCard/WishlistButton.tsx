"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addToWishlist,
  removeFromWishlist,
} from "@/lib/actions/wishlist";

type Props = {
  productId: string;
  initialWishlisted: boolean;
};

export default function WishlistButton({
  productId,
  initialWishlisted,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [isWishlisted, setIsWishlisted] =
    useState(initialWishlisted);

  const [pending, startTransition] =
    useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        if (isWishlisted) {
          await removeFromWishlist(productId);
          setIsWishlisted(false);
        } else {
          await addToWishlist(productId);
          setIsWishlisted(true);
        }
      } catch {
        router.push(
          `/login?redirect=${encodeURIComponent(pathname)}`
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="
        absolute
        right-4
        top-4
        z-10
        rounded-full
        bg-white
        p-2
        shadow-md
        transition-all
        duration-200
        hover:scale-110
        active:scale-90
        disabled:opacity-60
      "
    >
      {isWishlisted ? "❤️" : "♡"}
    </button>
  );
}