import { NextRequest, NextResponse } from "next/server";

import { callAI } from "@/lib/vto/aiClient";

export async function POST(
  request: NextRequest
) {
  try {
    const formData = await request.formData();

    const person = formData.get("person");
    const garment = formData.get("garment");

    if (!person || !garment) {
      return NextResponse.json(
        {
          success: false,
          message: "Person and garment images are required.",
        },
        {
          status: 400,
        }
      );
    }

    const aiForm = new FormData();

    aiForm.append(
      "person",
      person as Blob
    );

    aiForm.append(
      "garment",
      garment as Blob
    );

    const result = await callAI(
      "/pipeline/process",
      aiForm
    );

    return NextResponse.json(result);

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "AI processing failed."
      },
      {
        status: 500
      }
    );
  }
}