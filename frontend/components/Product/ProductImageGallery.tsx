"use client";

import { useState } from "react";

type Props = {
  images: {
    imageUrl: string;
  }[];
  productName: string;
};

export default function ProductImageGallery({
  images,
  productName,
}: Props) {
  const [currentImage, setCurrentImage] = useState(0);

  function previousImage() {
    setCurrentImage((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  }

  function nextImage() {
    setCurrentImage((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex h-[650px] items-center justify-center rounded-3xl bg-gray-100">
        No Image
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-100">

      <img
        key={images[currentImage].imageUrl}
        src={images[currentImage].imageUrl}
        alt={productName}
        className="h-[650px] w-full object-cover transition-opacity duration-300"
      />

      <button
        onClick={previousImage}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/40 px-4 py-3 text-xl backdrop-blur transition-all duration-200 hover:bg-white/80"
      >
        ‹
      </button>

      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/40 px-4 py-3 text-xl backdrop-blur transition-all duration-200 hover:bg-white/80"
      >
        ›
      </button>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm">

        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              index === currentImage
                ? "bg-white scale-125"
                : "bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}

      </div>

    </div>
  );
}