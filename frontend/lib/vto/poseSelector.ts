import type { ExtractedFrame } from "./frameExtractor";

export type { ExtractedFrame };

export type SelectedPose = {
  front?: ExtractedFrame;
  left?: ExtractedFrame;
  right?: ExtractedFrame;
  back?: ExtractedFrame;
};

const AI_BASE =
  process.env.NEXT_PUBLIC_AI_SERVER_URL ??
  "http://127.0.0.1:8000";

async function detectPose(
  frame: ExtractedFrame
) {
  const imageResponse = await fetch(frame.imageUrl);

  const blob = await imageResponse.blob();

  const form = new FormData();

  form.append(
    "image",
    blob,
    frame.fileName
  );

  const response = await fetch(
    `${AI_BASE}/pose/detect`,
    {
      method: "POST",
      body: form,
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function selectCanonicalFrames(
  frames: ExtractedFrame[]
): Promise<SelectedPose> {

  const result: SelectedPose = {};

  let bestFront = -1;
  let bestLeft = -1;
  let bestRight = -1;
  let bestBack = -1;

  for (const frame of frames) {

    const pose = await detectPose(frame);

    if (
      !pose ||
      !pose.success ||
      !pose.detected
    ) {
      continue;
    }

    frame.angle = pose.orientation;

    frame.qualityScore =
      pose.confidence;

    switch (pose.orientation) {

      case "front":

        if (
          pose.confidence >
          bestFront
        ) {

          bestFront =
            pose.confidence;

          result.front = frame;
        }

        break;

      case "left":

        if (
          pose.confidence >
          bestLeft
        ) {

          bestLeft =
            pose.confidence;

          result.left = frame;
        }

        break;

      case "right":

        if (
          pose.confidence >
          bestRight
        ) {

          bestRight =
            pose.confidence;

          result.right = frame;
        }

        break;

      case "back":

        if (
          pose.confidence >
          bestBack
        ) {

          bestBack =
            pose.confidence;

          result.back = frame;
        }

        break;
    }
  }

  return result;
}