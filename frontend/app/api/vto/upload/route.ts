import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

import { saveVideo } from "@/lib/vto/storage";
import { preprocessVideo } from "@/lib/vto/orchestrator";

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();

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

    if (!video) {
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

    const extension =
      video.name.split(".").pop() ?? "mp4";

    const fileName =
      `${randomUUID()}.${extension}`;

    const savedVideo =
      await saveVideo(video, fileName);

    const preprocessing =
      await preprocessVideo(
        savedVideo.absolutePath
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

    return NextResponse.json({
      success: true,
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