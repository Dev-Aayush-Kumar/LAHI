import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { AppError, ErrorCodes } from "@/lib/errors";
import type { StorageBackend, StoredObject } from "@/lib/storage/types";

function resolveRoot() {
  return process.env.STORAGE_LOCAL_ROOT
    ? path.resolve(process.env.STORAGE_LOCAL_ROOT)
    : path.join(process.cwd(), "public", "uploads");
}

function safeResolve(root: string, key: string) {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid storage key.",
      400
    );
  }

  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(path.resolve(root))) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid storage key.",
      400
    );
  }

  return absolute;
}

export class LocalStorageBackend implements StorageBackend {
  constructor(private readonly root = resolveRoot()) {}

  async put(
    key: string,
    bytes: Buffer,
    contentType: string
  ): Promise<StoredObject> {
    const absolute = safeResolve(this.root, key);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, bytes);

    return {
      key,
      contentType,
      sizeBytes: bytes.length,
      checksum: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  async get(key: string): Promise<Buffer> {
    const absolute = safeResolve(this.root, key);
    return fs.readFile(absolute);
  }

  async delete(key: string): Promise<void> {
    const absolute = safeResolve(this.root, key);
    await fs.rm(absolute, { force: true });
  }

  publicUrl(key: string): string | null {
    const publicBase = process.env.STORAGE_PUBLIC_BASE_URL;
    if (publicBase) {
      return `${publicBase.replace(/\/$/, "")}/${key.replace(/^\/+/, "")}`;
    }

    return `/uploads/${key.replace(/^\/+/, "")}`;
  }
}
