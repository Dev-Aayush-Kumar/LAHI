const CLOTHING_IMAGES = [
  "front",
  "front_left",
  "left",
  "back_left",
  "back",
  "back_right",
  "right",
  "front_right",
] as const;

const FOOTWEAR_IMAGES = [
  "right_foot",
  "front_right_foot",
  "front",
  "front_left_foot",
  "left_foot",
  "back_left_foot",
  "back",
  "back_right_foot",
] as const;

export const PRODUCTS = [
  {
    name: "Oversized Cotton T-Shirt",

    slug: "oversized-cotton-tshirt",

    description:
      "Premium oversized cotton t-shirt with relaxed fit.",

    category: "men",

    brand: "hm",

    gender: "Men",

    dealerPrice: 420,

    rating: 4.7,

    reviewCount: 182,

    featured: true,

    trending: true,

    colors: [
      "BLACK",
      "WHITE",
    ],

    sizes: [
      "S",
      "M",
      "L",
      "XL",
    ],

    images: CLOTHING_IMAGES,
  },

  {
    name: "Women's Summer Dress",

    slug: "womens-summer-dress",

    description:
      "Elegant floral summer dress for casual outings.",

    category: "women",

    brand: "zara",

    gender: "Women",

    dealerPrice: 650,

    rating: 4.8,

    reviewCount: 264,

    featured: true,

    trending: true,

    colors: [
      "PINK",
      "BLUE",
    ],

    sizes: [
      "S",
      "M",
      "L",
    ],

    images: CLOTHING_IMAGES,
  },

  {
    name: "Nike Air Sneakers",

    slug: "nike-air-sneakers",

    description:
      "Lightweight everyday sneakers with premium comfort.",

    category: "men",

    brand: "nike",

    gender: "Men",

    dealerPrice: 900,

    rating: 4.9,

    reviewCount: 541,

    featured: true,

    trending: true,

    colors: [
      "WHITE",
      "BLACK",
    ],

    sizes: [
      "7",
      "8",
      "9",
      "10",
    ],

    images: FOOTWEAR_IMAGES,
  },
] as const;