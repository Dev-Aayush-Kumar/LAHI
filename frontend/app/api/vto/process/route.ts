import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createTryOnJob } from "@/lib/vto/tryOnJobs";
import { createCorrelationId } from "@/lib/logger";
import { AppError, ErrorCodes } from "@/lib/errors";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const correlationId = createCorrelationId();
  try {
    const user = await requireUser();
    const limited = rateLimit(`tryon:${user.userId}`, 8, 60_000);
    if (!limited.ok) {
      throw new AppError(ErrorCodes.RATE_LIMITED, "Too many try-on requests.", 429);
    }

    const body = await request.json();
    if (!body.modelId || !body.productId) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "Model and product are required.",
        400
      );
    }

    const job = await createTryOnJob({
      userId: user.userId,
      modelId: body.modelId,
      productId: body.productId,
      correlationId,
    });

    return jsonOk({ jobId: job.id, status: job.status, correlationId });
  } catch (error) {
    return jsonError(error, correlationId);
  }
}
