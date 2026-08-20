import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { serveTryOnMediaForUser } from "@/lib/vto/media";
import { syncTryOnJob } from "@/lib/vto/tryOnJobs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireUser();
    const { jobId } = await context.params;
    const job = await syncTryOnJob(jobId, user.userId);
    const media = await serveTryOnMediaForUser({
      userId: user.userId,
      job: {
        id: job.id,
        userId: job.userId,
        status: job.status,
        outputAssetIds: job.outputAssetIds,
      },
    });
    return new NextResponse(new Uint8Array(media.bytes), {
      headers: {
        "Content-Type": media.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
