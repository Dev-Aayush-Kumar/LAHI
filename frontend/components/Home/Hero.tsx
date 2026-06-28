import Button from "@/components/Shared/Button";

export default function Hero() {
  return (
    <section className="bg-[#F8F6F2]">
      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-between gap-16 px-6 py-20 lg:flex-row">

        {/* ================= LEFT ================= */}
        <div className="w-full lg:w-1/2">

          <span className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-600 shadow-sm">
            ✨ Virtual Fashion Try-On
          </span>

          <h1 className="mt-8 text-5xl font-extrabold leading-tight text-[#111111] md:text-7xl">
            How Does That Look{" "}
            <span className="text-[#B76E79]">
              on You?
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-gray-600">
            Experience fashion before you buy.
            Upload your photo, visualize outfits instantly,
            and shop with confidence using intelligent virtual try-on.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">

            <Button variant="primary">
              Try It On
            </Button>

            <Button variant="secondary">
              Browse Collection
            </Button>

          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-sm font-medium text-gray-600">

            <span className="flex items-center gap-2">
              ✓ Fast
            </span>

            <span className="flex items-center gap-2">
              ✓ Privacy First
            </span>

            <span className="flex items-center gap-2">
              ✓ Personalized
            </span>

          </div>

          <p className="mt-12 text-sm font-semibold uppercase tracking-[0.25em] text-[#B76E79]">
            See Before You Buy.
          </p>

        </div>

        {/* ================= RIGHT ================= */}
        <div className="flex w-full justify-center lg:w-1/2">

          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">

            <div className="mb-6 flex items-center justify-between">

              <h3 className="text-xl font-semibold text-[#111111]">
                Your Look
              </h3>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                Live Preview
              </span>

            </div>

            <div className="flex h-[360px] items-center justify-center rounded-2xl bg-[#F8F6F2]">

              <div className="text-center">

                <div className="text-8xl">
                  👤
                </div>

                <p className="mt-4 text-gray-500">
                  Upload your photo
                </p>

              </div>

            </div>

            <div className="mt-8">

              <div className="mb-2 flex items-center justify-between text-sm">

                <span className="text-gray-600">
                  Styling Preview
                </span>

                <span className="font-semibold text-[#111111]">
                  72%
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-200">

                <div className="h-full w-[72%] rounded-full bg-[#111111]"></div>

              </div>

            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">

              <div className="rounded-2xl bg-[#F8F6F2] p-4">

                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Fit Score
                </p>

                <p className="mt-2 text-2xl font-bold">
                  94%
                </p>

              </div>

              <div className="rounded-2xl bg-[#F8F6F2] p-4">

                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Style Match
                </p>

                <p className="mt-2 text-2xl font-bold">
                  Excellent
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}