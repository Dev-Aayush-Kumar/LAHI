export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateShipping(subtotal: number) {
  return subtotal > 999 ? 0 : 99;
}

export function calculateTax(subtotal: number, rate = 0.18) {
  return roundMoney(subtotal * rate);
}

export function calculateDiscount(params: {
  type: string;
  value: number;
  subtotal: number;
}) {
  if (params.type === "PERCENT") {
    return roundMoney((params.subtotal * params.value) / 100);
  }

  return roundMoney(Math.min(params.value, params.subtotal));
}

export function calculateOrderTotals(params: {
  subtotal: number;
  discountAmount?: number;
}) {
  const discountAmount = roundMoney(params.discountAmount ?? 0);
  const discountedSubtotal = Math.max(params.subtotal - discountAmount, 0);
  const shipping = calculateShipping(discountedSubtotal);
  const tax = calculateTax(discountedSubtotal);
  const total = roundMoney(discountedSubtotal + shipping + tax);

  return {
    subtotal: roundMoney(params.subtotal),
    discountAmount,
    shipping,
    tax,
    total,
  };
}
