import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { syncTryOnJob } from "@/lib/vto/tryOnJobs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireUser();
    const { jobId } = await context.params;
    const job = await syncTryOnJob(jobId, user.userId);
    return jsonOk({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      error: job.errorMessage,
    });
  } catch (error) {
    return jsonError(error);
  }
}
