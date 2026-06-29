import {
  Hero,
  Categories,
  TrendingProducts,
  Footer,
  WhyLAHI,
} from "@/components/Home";

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <TrendingProducts />
      <WhyLAHI />
      <Footer />
    </>
  );
}