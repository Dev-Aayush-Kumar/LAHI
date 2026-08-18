import assert from "node:assert/strict";
import test from "node:test";
import os from "node:os";
import path from "node:path";

import { LocalStorageBackend } from "../lib/storage/local";
import { AppError } from "../lib/errors";

test("local storage writes and rejects path traversal", async () => {
  const root = path.join(os.tmpdir(), `lahi-storage-${Date.now()}`);
  const storage = new LocalStorageBackend(root);
  const stored = await storage.put("people/a.png", Buffer.from("hello"), "image/png");
  assert.equal(stored.sizeBytes, 5);
  const loaded = await storage.get("people/a.png");
  assert.equal(loaded.toString(), "hello");

  await assert.rejects(
    () => storage.put("../secret.txt", Buffer.from("nope"), "text/plain"),
    (error: unknown) => error instanceof AppError
  );
});
