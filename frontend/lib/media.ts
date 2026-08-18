import { createHash, randomUUID } from "crypto";

import type { PrismaClient } from "@/lib/generated/prisma/client";

import { getStorage } from "@/lib/storage";

export async function storeMediaAsset(
  db: PrismaClient,
  input: {
    ownerUserId?: string;
    kind: string;
    contentType: string;
    bytes: Buffer;
    fileName?: string;
  }
) {
  const extension = (input.fileName?.split(".").pop() || "bin").toLowerCase();
  const key = `${input.kind}/${randomUUID()}.${extension}`;
  const stored = await getStorage().put(key, input.bytes, input.contentType);

  return db.mediaAsset.create({
    data: {
      ownerUserId: input.ownerUserId,
      kind: input.kind,
      contentType: input.contentType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.key,
      checksum:
        stored.checksum ??
        createHash("sha256").update(input.bytes).digest("hex"),
    },
  });
}
