import { NextRequest, NextResponse } from "next/server";
import { imageUrlToFile } from "@/lib/vto/imageLoader";
import { prisma } from "@/lib/prisma";
import { callAI } from "@/lib/vto/aiClient";
import { createJob } from "@/lib/vto/jobManager";
import { getCurrentUser } from "@/lib/auth";

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

    const body = await request.json();

    const {
      modelId,
      productId,
    } = body;

    if (!modelId || !productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Model and product are required.",
        },
        {
          status: 400,
        }
      );
    }

    const model =
      await prisma.userModel.findFirst({
        where: {
          id: modelId,
          userId: user.userId,
        },
      });

    if (!model) {
      return NextResponse.json(
        {
          success: false,
          message: "Model not found.",
        },
        {
          status: 404,
        }
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
        include: {
          images: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
          },
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        {
          status: 404,
        }
      );
    }

    const personImage =
      model.frontImageUrl;

    const garmentImage =
      product.images[0]?.imageUrl;

    if (!personImage || !garmentImage) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing model or garment image.",
        },
        {
          status: 400,
        }
      );
    }

    const personFile =
      await imageUrlToFile(
        personImage,
        "person.jpg"
      );

    const garmentFile =
      await imageUrlToFile(
        garmentImage,
        "garment.jpg"
      );

    const aiForm = new FormData();

    aiForm.append(
      "person",
      personFile
    );

    aiForm.append(
      "garment",
      garmentFile
    );

    const aiResult =
      await callAI(
        "/pipeline/process",
        aiForm
      );

    const job =
      await prisma.tryOnJob.create({
        data: {
          userId: user.userId,
          modelId,
          productId,

          status: "PROCESSING",

          progress: 100,

          startedAt: new Date(),

          completedAt: new Date(),
        },
      });

    await prisma.tryOnResult.create({
      data: {
        jobId: job.id,

        generatedImageUrl:
          aiResult.generatedImageUrl,

        modelName:
          aiResult.modelName,

        generationTimeMs:
          aiResult.generationTimeMs,
      },
    });

    return NextResponse.json({
      success: true,

      jobId: job.id,

      generatedImageUrl:
        aiResult.generatedImageUrl,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "AI processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}