"use client";

import { useParams } from "next/navigation";

export default function TryOnPage() {
  const params = useParams();

  const productId = params.productId as string;

  return (
    <main className="mx-auto max-w-7xl p-8">

      <h1 className="text-4xl font-bold">
        Virtual Try-On
      </h1>

      <p className="mt-2 text-gray-500">
        Product ID:
      </p>

      <p className="font-mono">
        {productId}
      </p>

      <div className="mt-10 grid grid-cols-3 gap-8">

        <section className="rounded-xl border p-6">

          <h2 className="text-xl font-semibold">
            Your Model
          </h2>

          <div className="mt-4 h-96 rounded-lg bg-gray-100 flex items-center justify-center">
            Model Preview
          </div>

        </section>

        <section className="rounded-xl border p-6">

          <h2 className="text-xl font-semibold">
            Garment
          </h2>

          <div className="mt-4 h-96 rounded-lg bg-gray-100 flex items-center justify-center">
            Product Preview
          </div>

        </section>

        <section className="rounded-xl border p-6">

          <h2 className="text-xl font-semibold">
            AI Result
          </h2>

          <div className="mt-4 h-96 rounded-lg bg-gray-100 flex items-center justify-center">
            Generated Image
          </div>

        </section>

      </div>

      <div className="mt-10">

        <button
          className="rounded-lg bg-black px-8 py-3 text-white"
        >
          Generate Try-On
        </button>

      </div>

    </main>
  );
}