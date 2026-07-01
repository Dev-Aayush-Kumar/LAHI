"use client";

import { useFormStatus } from "react-dom";
import Button from "@/components/Shared/Button";

export default function AddToCartButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      disabled={pending}
      className="w-full"
    >
      {pending ? "Adding..." : "🛍 Add to Cart"}
    </Button>
  );
}