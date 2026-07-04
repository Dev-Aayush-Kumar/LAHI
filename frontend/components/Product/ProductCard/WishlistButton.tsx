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
  variant?: "floating" | "inline";
};

export default function WishlistButton({
  productId,
  initialWishlisted,
  variant = "floating",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [isWishlisted, setIsWishlisted] =
    useState(initialWishlisted);

  const [pending, startTransition] =
    useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isWishlisted) {
        const result =
          await removeFromWishlist(productId);

        if (result.requiresLogin) {
          router.push(
            `/login?redirect=${encodeURIComponent(
              pathname
            )}`
          );
          return;
        }

        setIsWishlisted(false);

        return;
      }

      const result =
        await addToWishlist(productId);

      if (result.requiresLogin) {
        router.push(
          `/login?redirect=${encodeURIComponent(
            pathname
          )}`
        );
        return;
      }

      setIsWishlisted(true);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        variant === "floating"
          ? `
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
          `
          : `
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-gray-300
            bg-white
            text-xl
            shadow-sm
            transition
            hover:border-black
            hover:shadow-md
            active:scale-95
            disabled:opacity-60
          `
      }
    >
      {isWishlisted ? "❤️" : "♡"}
    </button>
  );
}