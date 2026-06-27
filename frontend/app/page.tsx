import Navbar from "@/components/Navbar";
import { Hero } from "@/components/Home";
import Categories from "@/components/Home/Categories";
import FeaturedProducts from "@/components/Home/FeaturedProducts";
export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Categories />
      <FeaturedProducts />
    </>
  );
}