import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveVideo } from "@/lib/vto/storage";

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

    const video = formData.get("video") as File | null;

    const modelName =
      (formData.get("modelName") as string) ??
      "My Model";

    const relation =
      (formData.get("relation") as string) ??
      "Self";

    if (!video) {
      return NextResponse.json(
        {
          success: false,
          message: "Video not received.",
        },
        {
          status: 400,
        }
      );
    }

    // Generate unique filename
    const extension =
      video.name.split(".").pop() ?? "mp4";

    const fileName = `${randomUUID()}.${extension}`;

    // Save video locally
    const videoUrl = await saveVideo(
      video,
      fileName
    );

    // Create UserModel
    const model =
      await prisma.userModel.create({
        data: {
          userId: user.userId,
          name: modelName,
          relation,
          sourceVideoUrl: videoUrl,
        },
      });

    return NextResponse.json({
      success: true,
      modelId: model.id,
      status: model.status,
      relation,
      modelName,
      videoUrl,
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