import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDiscount,
  calculateOrderTotals,
  calculateShipping,
  calculateTax,
} from "../lib/commerce/money";
import { availableStock } from "../lib/commerce/inventory";

test("shipping is free above the threshold", () => {
  assert.equal(calculateShipping(1000), 0);
  assert.equal(calculateShipping(999), 99);
});

test("GST is calculated on the discounted subtotal path", () => {
  assert.equal(calculateTax(1000), 180);
});

test("percent and fixed coupons cap at the subtotal", () => {
  assert.equal(calculateDiscount({ type: "PERCENT", value: 10, subtotal: 500 }), 50);
  assert.equal(calculateDiscount({ type: "FIXED", value: 80, subtotal: 50 }), 50);
});

test("order totals combine shipping tax and discount", () => {
  const totals = calculateOrderTotals({ subtotal: 1000, discountAmount: 100 });
  assert.equal(totals.shipping, 99);
  assert.equal(totals.tax, 162);
  assert.equal(totals.total, 1161);
});

test("available stock never goes negative", () => {
  assert.equal(availableStock(4, 1), 3);
  assert.equal(availableStock(1, 4), 0);
});
