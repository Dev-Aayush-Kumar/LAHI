import assert from "node:assert/strict";
import test from "node:test";

import { AppError, ErrorCodes, toPublicError } from "../lib/errors";

test("public errors never include internal details", () => {
  const publicError = toPublicError(new Error("ENOENT /secret/weights.bin"));
  assert.equal(publicError.code, ErrorCodes.INTERNAL_ERROR);
  assert.equal(publicError.message, "Something went wrong.");

  const appError = toPublicError(
    new AppError(ErrorCodes.INSUFFICIENT_STOCK, "Out of stock.", 409)
  );
  assert.equal(appError.status, 409);
  assert.equal(appError.message, "Out of stock.");
});
