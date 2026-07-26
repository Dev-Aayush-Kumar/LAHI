export async function fetchProduct(
  productId: string
) {
  const response = await fetch(
    `/api/vto/product/${productId}`
  );

  return response.json();
}