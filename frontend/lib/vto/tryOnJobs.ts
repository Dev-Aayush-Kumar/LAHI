import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { callAI, getAIJson, postAIJson } from "@/lib/vto/aiClient";
import { imageUrlToFile } from "@/lib/vto/imageLoader";
import { log } from "@/lib/logger";

async function uploadAsset(file: File, kind: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return callAI("/v1/assets", form) as Promise<{ asset_id: string }>;
}

export async function createTryOnJob(input: {
  userId: string;
  modelId: string;
  productId: string;
  correlationId: string;
}) {
  const model = await prisma.userModel.findFirst({
    where: { id: input.modelId, userId: input.userId, status: "READY" },
  });
  if (!model?.frontImageUrl) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "A ready personal model with a front view is required.",
      400
    );
  }

  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!product?.images[0]) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "This product is not available for try-on.",
      404
    );
  }

    const personFile = await imageUrlToFile(model.frontImageUrl, "person.jpg");
    const garmentFile = await imageUrlToFile(
      product.images[0].imageUrl,
      "garment.jpg"
    );
    const personAsset = await uploadAsset(personFile, "person");
    const garmentAsset = await uploadAsset(garmentFile, "garment");

    const remote = await postAIJson("/v1/jobs", {
      operation: "virtual_try_on",
      asynchronous: true,
      assets: [
        { asset_id: personAsset.asset_id, content_type: "image/jpeg" },
        { asset_id: garmentAsset.asset_id, content_type: "image/jpeg" },
      ],
      metadata: {
        correlation_id: input.correlationId,
      },
    });

  const job = await prisma.tryOnJob.create({
    data: {
      userId: input.userId,
      modelId: model.id,
      productId: product.id,
      status: "QUEUED",
      progress: 0,
      requestId: remote.request_id,
      remoteJobId: remote.request_id,
      operation: "virtual_try_on",
      correlationId: input.correlationId,
      inputAssetIds: [personAsset.asset_id, garmentAsset.asset_id],
    },
  });

  log("info", "Created try-on job", {
    correlationId: input.correlationId,
    jobId: job.id,
    requestId: remote.request_id,
  });

  return job;
}

export async function syncTryOnJob(jobId: string, userId: string) {
  const job = await prisma.tryOnJob.findFirst({
    where: { id: jobId, userId },
    include: { result: true },
  });
  if (!job) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Try-on job not found.", 404);
  }
  if (!job.remoteJobId) {
    return job;
  }

  const remote = await getAIJson(`/v1/jobs/${job.remoteJobId}`);
  const status =
    remote.status === "completed"
      ? "COMPLETED"
      : remote.status === "failed"
        ? "FAILED"
        : remote.status === "cancelled"
          ? "CANCELLED"
          : remote.status === "processing"
            ? "PROCESSING"
            : "QUEUED";

  const updated = await prisma.tryOnJob.update({
    where: { id: job.id },
    data: {
      status,
      progress: remote.progress ?? (status === "COMPLETED" ? 100 : job.progress),
      provider: remote.model?.provider,
      modelVersion: remote.model?.version,
      errorCode: remote.error?.code,
      errorMessage: remote.error?.message,
      startedAt: remote.timing?.started_at
        ? new Date(remote.timing.started_at)
        : job.startedAt,
      completedAt: remote.timing?.completed_at
        ? new Date(remote.timing.completed_at)
        : job.completedAt,
      outputAssetIds: remote.result?.output_asset_ids ?? job.outputAssetIds,
    },
  });

  if (status === "COMPLETED" && remote.result?.generated_image_url && !job.result) {
    await prisma.tryOnResult.create({
      data: {
        jobId: job.id,
        generatedImageUrl: remote.result.generated_image_url,
        modelName: remote.model?.model ?? remote.model?.provider,
        generationTimeMs: remote.timing?.duration_ms
          ? Math.round(remote.timing.duration_ms)
          : null,
      },
    });
  }

  return prisma.tryOnJob.findUniqueOrThrow({
    where: { id: updated.id },
    include: { result: true },
  });
}
