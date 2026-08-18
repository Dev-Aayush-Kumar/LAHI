import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { checkAIHealth } from "@/lib/vto/health";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createJob, updateJob } from "@/lib/vto/jobManager";
import { AIJobStatus } from "@/lib/vto/jobStatus";
import { saveVideo } from "@/lib/vto/storage";
import { preprocessVideo } from "@/lib/vto/orchestrator";

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    const aiOnline = await checkAIHealth();

    if (!aiOnline) {
      return NextResponse.json(
        {
          success: false,
          message: "AI Server is offline."
        },
        {
          status: 503
        }
      );
    }
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        {
          status: 401,
        }
      );
    }

    const formData = await request.formData();

    const video =
      formData.get("video") as File | null;

    const modelName =
      (formData.get("modelName") as string) ??
      "Me";

    const relation =
      (formData.get("relation") as string) ??
      "Self";

    if (!(video instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Video missing.",
        },
        {
          status: 400,
        }
      );
    }

    const extensionByType: Record<string, string> = {
      "video/mp4": "mp4",
      "video/quicktime": "mov",
      "video/webm": "webm",
    };
    const extension = extensionByType[video.type];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          message: "Only MP4, MOV, and WebM videos are supported.",
        },
        { status: 415 }
      );
    }

    if (video.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: "Video exceeds the 100 MB size limit.",
        },
        { status: 413 }
      );
    }

    const fileName =
      `${randomUUID()}.${extension}`;

    const savedVideo =
      await saveVideo(video, fileName);
    const jobId = createJob();

    updateJob(
      jobId,
      AIJobStatus.PREPROCESSING,
      10,
      "Extracting video frames..."
    );
    const preprocessing =
      await preprocessVideo(
        savedVideo.absolutePath
      );
    updateJob(
      jobId,
      AIJobStatus.DETECTING_POSE,
      30,
      "Preparing AI analysis..."
    );

    const model =
      await prisma.userModel.create({
        data: {
          userId: user.userId,

          name: modelName,

          relation,

          sourceVideoUrl:
            savedVideo.publicUrl,

          frontImageUrl:
            preprocessing.frontImageUrl,

          leftImageUrl:
            preprocessing.leftImageUrl,

          rightImageUrl:
            preprocessing.rightImageUrl,

          backImageUrl:
            preprocessing.backImageUrl,

          status: "READY",
        },
      });
    updateJob(
      jobId,
      AIJobStatus.FINISHED,
      100,
      "Completed"
    );
    return NextResponse.json({
      success: true,
      jobId,
      modelId: model.id,
      status: model.status,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}