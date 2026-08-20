import { AppError, ErrorCodes } from "@/lib/errors";
import { getAIBinary } from "@/lib/vto/aiClient";

const INTERNAL_ASSET_CONTENT =
  /\/v1\/assets\/([A-Za-z0-9_-]+)\/content(?:\?.*)?$/;

export function browserFacingResultUrl(jobId: string) {
  return `/api/vto/media/${jobId}`;
}

export function isInternalAiAssetUrl(url: string) {
  return INTERNAL_ASSET_CONTENT.test(url) || url.startsWith("/v1/assets/");
}

export function assetIdFromInternalUrl(url: string | undefined | null) {
  if (!url) {
    return null;
  }
  const match = url.match(INTERNAL_ASSET_CONTENT);
  return match?.[1] ?? null;
}

export function tryOnOutputAssetId(outputAssetIds: unknown) {
  if (Array.isArray(outputAssetIds) && typeof outputAssetIds[0] === "string") {
    return outputAssetIds[0];
  }
  return null;
}

export function browserFacingResultFromRemote(
  jobId: string,
  remoteResult: {
    generated_image_url?: string;
    output_asset_id?: string;
    output_asset_ids?: unknown;
  } | null
) {
  if (!remoteResult) {
    return null;
  }
  const assetId =
    remoteResult.output_asset_id ??
    tryOnOutputAssetId(remoteResult.output_asset_ids) ??
    assetIdFromInternalUrl(remoteResult.generated_image_url);
  if (!assetId) {
    return null;
  }
  return browserFacingResultUrl(jobId);
}

export async function fetchAIAssetContent(assetId: string) {
  return getAIBinary(`/v1/assets/${assetId}/content`);
}

type MediaJob = {
  id: string;
  userId: string;
  status: string;
  outputAssetIds?: unknown;
};

export async function serveTryOnMediaForUser(input: {
  userId: string;
  job: MediaJob | null;
  fetchAsset?: typeof fetchAIAssetContent;
}) {
  const { job, userId } = input;
  if (!job || job.userId !== userId || job.status !== "COMPLETED") {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "Try-on result is not ready.",
      404
    );
  }

  const assetId = tryOnOutputAssetId(job.outputAssetIds);
  if (!assetId) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "Try-on result is not ready.",
      404
    );
  }

  const fetchAsset = input.fetchAsset ?? fetchAIAssetContent;
  return fetchAsset(assetId);
}
