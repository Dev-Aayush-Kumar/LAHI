export type StoredObject = {
  key: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string;
};

export interface StorageBackend {
  put(
    key: string,
    bytes: Buffer,
    contentType: string
  ): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string | null;
}

export const OBJECT_STORAGE_DRIVERS = [
  "local",
  "s3",
  "r2",
  "minio",
] as const;

export type ObjectStorageDriver = (typeof OBJECT_STORAGE_DRIVERS)[number];
