import { categories } from "@/data/categories";
export default function Categories() {
  return (
    <section className="bg-[#F8F6F2] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-4xl font-bold text-[#111111]">
          Shop by Category
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
          Discover curated collections designed for every style and every occasion.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <div
              key={category.name}
              className="cursor-pointer rounded-3xl bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="mb-4 text-5xl">
                {category.emoji}
              </div>

              <h3 className="font-semibold text-[#111111]">
                {category.name}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}