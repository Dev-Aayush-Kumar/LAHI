"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { searchProducts } from "@/lib/actions/search";

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const router = useRouter();
    useEffect(() => {
    async function fetchResults() {
        if (!query.trim()) {
        setResults([]);
        return;
        }

        const data = await searchProducts(query);

        setResults(data);
    }

    fetchResults();
    }, [query]);
  return (
    <div className="relative hidden lg:block w-96">

      <Search
        size={18}
        className="
          absolute
          left-4
          top-1/2
          -translate-y-1/2
          text-gray-400
          pointer-events-none
        "
      />

      <input
        type="text"
        placeholder="Search products, brands..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="
          w-full
          rounded-full
          border
          border-gray-300
          bg-white
          py-3
          pl-11
          pr-5
          text-sm
          shadow-sm
          transition-all
          duration-300
          outline-none
          focus:border-black
          focus:shadow-md
          focus:ring-2
          focus:ring-black/10
          placeholder:text-gray-400
        "
      onKeyDown={(e) =>{
        if (e.key=== "Enter" && query.trim()) {
            router.push(
                `/search?q=${encodeURIComponent(query)}`
            );
        }
      }}
      />
      {results.length > 0 && (
      <div
          className="
          absolute
          top-full
          left-0
          mt-2
          w-full
          rounded-2xl
          border
          bg-white
          shadow-xl
          overflow-hidden
          z-50
          "
      >
          {results.map((product) => (
          <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="
              flex
              items-center
              gap-4
              p-4
              transition
              hover:bg-gray-100
              "
          >
              <img
              src={product.images[0]?.imageUrl}
              alt={product.name}
              className="h-14 w-14 rounded-lg object-cover"
              />

              <div>
              <p className="font-semibold">
                  {product.name}
              </p>
  
              <p className="text-sm text-gray-500">
                  {product.brand.name}
              </p>
              </div>
          </Link>
          ))}
      </div>
      )}

    </div>
  );
}