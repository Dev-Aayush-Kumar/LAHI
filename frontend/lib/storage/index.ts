import { AppError, ErrorCodes } from "@/lib/errors";
import { LocalStorageBackend } from "@/lib/storage/local";
import type {
  ObjectStorageDriver,
  StorageBackend,
} from "@/lib/storage/types";

class UnconfiguredObjectStorage implements StorageBackend {
  constructor(private readonly driver: ObjectStorageDriver) {}

  async put(): Promise<never> {
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      `${this.driver} object storage is not configured.`,
      501
    );
  }

  async get(): Promise<never> {
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      `${this.driver} object storage is not configured.`,
      501
    );
  }

  async delete(): Promise<never> {
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      `${this.driver} object storage is not configured.`,
      501
    );
  }

  publicUrl(): string | null {
    return null;
  }
}

export function getStorage(): StorageBackend {
  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();

  if (driver === "local") {
    return new LocalStorageBackend();
  }

  if (driver === "s3" || driver === "r2" || driver === "minio") {
    return new UnconfiguredObjectStorage(driver);
  }

  throw new AppError(
    ErrorCodes.INTERNAL_ERROR,
    "Unsupported storage driver.",
    500
  );
}

export function assetPublicUrl(storageKey: string) {
  return getStorage().publicUrl(storageKey);
}
