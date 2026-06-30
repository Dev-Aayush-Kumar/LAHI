"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;

  images: {
    imageUrl: string;
  }[];

  productName: string;
};

export default function ProductCardImage({
  slug,
  images,
  productName,
}: Props) {
  const router = useRouter();

  const [currentImage, setCurrentImage] = useState(0);

  function previousImage(
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    e.stopPropagation();

    setCurrentImage((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  }

  function nextImage(
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    e.stopPropagation();

    setCurrentImage((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center bg-gray-100">
        No Image
      </div>
    );
  }

  return (
    <div className="relative h-72 overflow-hidden bg-gray-100">

      <img
        src={images[currentImage].imageUrl}
        alt={productName}
        className="h-full w-full cursor-pointer object-cover"
        onClick={() => router.push(`/product/${slug}`)}
      />

      <button
        onClick={previousImage}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/40 px-2 py-1 backdrop-blur transition hover:bg-white/80"
      >
        ‹
      </button>

      <button
        onClick={nextImage}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/40 px-2 py-1 backdrop-blur transition hover:bg-white/80"
      >
        ›
      </button>

    </div>
  );
}