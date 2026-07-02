export interface Product {
  id: number;
  brand: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  image: string;
  category: string;
  isTrending: boolean;
}
export type ProductCardProduct = {
  id: string;
  slug: string;
  name: string;

  sellingPrice: any;
  compareAtPrice: any | null;

  brand: {
    name: string;
  };

  images: {
    imageUrl: string;
  }[];

  variants: {
    id: string;
  }[];
};