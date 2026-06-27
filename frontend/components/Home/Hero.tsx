import Button from "@/components/Shared/Button";
export default function Hero() {
  return (
    <section className="bg-[#F8F6F2]">
      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center px-6 py-12 lg:flex-row">

        {/* LEFT */}
        <div className="w-full text-center lg:w-1/2 lg:text-left">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            LAHI
          </p>

          <h1 className="text-4xl font-bold leading-tight text-[#111111] sm:text-5xl lg:text-6xl">
            Your Style.
            <br />
            Before You Buy.
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-8 text-gray-600 lg:mx-0">
            See yourself. Not just the clothes.
            Discover fashion with confidence before making every purchase.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Button>
              Try It On
            </Button>

            <Button variant="secondary">
              Explore Collection
            </Button>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 text-gray-600">

  <div className="flex items-center gap-3">
    <span>✓</span>
    <span>Virtual Try-On</span>
  </div>

  <div className="flex items-center gap-3">
    <span>✓</span>
    <span>Smart Size Suggestions</span>
  </div>

  <div className="flex items-center gap-3">
    <span>✓</span>
    <span>Curated Fashion Picks</span>
  </div>

</div>

        {/* RIGHT */}
        <div className="mt-12 flex w-full justify-center lg:mt-0 lg:w-1/2">
          <div className="w-[420px] rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
      <h3 className="text-xl font-semibold text-[#111111]">
        Your Look
      </h3>

      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
        Live Preview
      </span>
    </div>

    <div className="flex h-[360px] items-center justify-center rounded-2xl bg-[#F8F6F2] text-7xl">
      👤
    </div>

    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          Styling Preview
        </span>

        <span className="font-medium">
          72%
        </span>
      </div>

      <div className="h-2 rounded-full bg-gray-200">
        <div className="h-2 w-[72%] rounded-full bg-black"></div>
      </div>
    </div>
          </div>
        </div>

      </div>
    </section>
  );
}