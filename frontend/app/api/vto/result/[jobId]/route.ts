import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { syncTryOnJob } from "@/lib/vto/tryOnJobs";
import { AppError, ErrorCodes } from "@/lib/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireUser();
    const { jobId } = await context.params;
    const job = await syncTryOnJob(jobId, user.userId);
    if (!job.result) {
      throw new AppError(
        ErrorCodes.NOT_FOUND,
        "Try-on result is not ready.",
        404
      );
    }
    return jsonOk({
      jobId: job.id,
      generatedImageUrl: job.result.generatedImageUrl,
      modelName: job.result.modelName,
    });
  } catch (error) {
    return jsonError(error);
  }
}
