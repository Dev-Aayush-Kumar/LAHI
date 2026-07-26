"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { fetchModels } from "@/lib/vto/models";
import { fetchProduct } from "@/lib/vto/product";

import ModelSelector, {
  UserModel,
} from "@/components/VTO/ModelSelector";

export default function TryOnPage() {
  const params = useParams();

  const productId = params.productId as string;

  const [models, setModels] = useState<UserModel[]>([]);
  const [selectedModel, setSelectedModel] =
    useState<string>();

  type Product = {
    id: string;
    name: string;
    brand: string;
    sellingPrice: number;
    imageUrl: string | null;
  };

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      const modelResponse =
        await fetchModels();

      if (modelResponse.success) {
        setModels(modelResponse.models);

        if (modelResponse.models.length > 0) {
          setSelectedModel(
            modelResponse.models[0].id
          );
        }
      }

      const productResponse =
        await fetchProduct(productId);

      if (productResponse.success) {
        setProduct(productResponse.product);
      }

      setLoading(false);
    }

    load();
  }, [productId]);

  return (
    <main className="mx-auto max-w-7xl p-8">

      <h1 className="text-4xl font-bold">
        Virtual Try-On
      </h1>

      <p className="mt-2 text-gray-500">
        Product ID
      </p>

      <p className="font-mono">
        {productId}
      </p>

      <section className="mt-10">

        <div className="flex items-center justify-between">

          <h2 className="text-2xl font-semibold">
            Choose Your Model
          </h2>

          <Link
            href="/try-on/upload"
            className="rounded-xl border px-5 py-3 hover:bg-gray-100"
          >
            + Upload New Person
          </Link>

        </div>

        {loading ? (

          <p className="mt-8">
            Loading models...
          </p>

        ) : models.length === 0 ? (

          <div className="mt-8 rounded-xl border p-10 text-center">

            <p>
              You haven't uploaded any models yet.
            </p>

            <Link
              href="/try-on/upload"
              className="mt-6 inline-block rounded-xl bg-black px-6 py-3 text-white"
            >
              Upload Your First Model
            </Link>

          </div>

        ) : (

          <div className="mt-8">

            <ModelSelector
              models={models}
              selected={selectedModel}
              onSelect={setSelectedModel}
            />

          </div>

        )}

      </section>

      <section className="mt-12">

        <h2 className="text-2xl font-semibold">
          Selected Garment
        </h2>

        {product ? (

          <div className="mt-6 rounded-xl border p-6">

          {product.imageUrl ? (

            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-96 w-full rounded-lg object-cover"
            />

          ) : (

            <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
              No Product Image
            </div>

          )}

            <h3 className="mt-5 text-2xl font-semibold">
              {product.name}
            </h3>

            <p className="text-gray-500">
              {product.brand}
            </p>

            <p className="mt-3 text-3xl font-bold">
              ₹{Number(
                product.sellingPrice
              ).toLocaleString()}
            </p>

          </div>

        ) : (

          <div className="mt-6 rounded-xl border p-10 text-center text-gray-500">
            Product not found.
          </div>

        )}

      </section>

      <div className="mt-12">

        <button
          disabled={!selectedModel}
          className="rounded-lg bg-black px-8 py-3 text-white disabled:opacity-50"
        >
          Generate Try-On
        </button>

      </div>

    </main>
  );
}