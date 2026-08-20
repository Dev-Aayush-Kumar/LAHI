import assert from "node:assert/strict";
import test from "node:test";

import { AppError, ErrorCodes } from "../lib/errors";
import {
  assertQuantityCoversReserved,
  availableStock,
} from "../lib/commerce/inventory";

test("available stock never goes negative", () => {
  assert.equal(availableStock(4, 1), 3);
  assert.equal(availableStock(1, 4), 0);
});

test("on-hand quantity cannot fall below reserved inventory", () => {
  assertQuantityCoversReserved(5, 5);
  assertQuantityCoversReserved(8, 5);
  assert.throws(
    () => assertQuantityCoversReserved(4, 5),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === ErrorCodes.VALIDATION_ERROR &&
      error.message.includes("reserved")
  );
});
