import Navbar from "@/components/Navbar";
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
      <Navbar />
      <Hero />
      <Categories />
      <TrendingProducts />
      <WhyLAHI />
      <Footer />
    </>
  );
}