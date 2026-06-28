export default function WhyLAHI() {
  const features = [
    {
      icon: "👤",
      title: "See Yourself",
      description:
        "Visualize outfits on yourself before making a purchase.",
    },
    {
      icon: "🤖",
      title: "AI Personalization",
      description:
        "Receive recommendations tailored to your style and preferences.",
    },
    {
      icon: "🛍️",
      title: "Shop Confidently",
      description:
        "Reduce uncertainty and buy only what truly suits you.",
    },
  ];

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">

        <div className="text-center">

          <h2 className="text-4xl font-bold text-[#111111]">
            Why Choose LAHI?
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Experience fashion shopping in a smarter way with
            AI-powered personalization and virtual try-on technology.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">

          {features.map((feature) => (

            <div
              key={feature.title}
              className="rounded-3xl border border-gray-200 bg-[#F8F6F2] p-10 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >

              <div className="text-6xl">
                {feature.icon}
              </div>

              <h3 className="mt-6 text-2xl font-semibold text-[#111111]">
                {feature.title}
              </h3>

              <p className="mt-4 leading-7 text-gray-600">
                {feature.description}
              </p>

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}