export function calculatePricing(dealerPrice: number) {
  let markupPercent: number;

  if (dealerPrice < 500) {
    markupPercent = 130;
  } else if (dealerPrice < 1000) {
    markupPercent = 110;
  } else if (dealerPrice < 3000) {
    markupPercent = 80;
  } else if (dealerPrice < 7000) {
    markupPercent = 60;
  } else {
    markupPercent = 45;
  }

  const sellingPrice = Math.round(
    dealerPrice * (1 + markupPercent / 100)
  );

  const compareAtPrice = Math.round(
    sellingPrice * 1.35
  );

  const discountPercent = Math.round(
    ((compareAtPrice - sellingPrice) /
      compareAtPrice) *
      100
  );

  return {
    dealerPrice,
    markupPercent,
    sellingPrice,
    compareAtPrice,
    discountPercent,
  };
}