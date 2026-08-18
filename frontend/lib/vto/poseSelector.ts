import type { ExtractedFrame } from "./frameExtractor";
import fs from "fs/promises";

export type { ExtractedFrame };

export type SelectedPose = {
  front?: ExtractedFrame;
  left?: ExtractedFrame;
  right?: ExtractedFrame;
  back?: ExtractedFrame;
};

async function detectPose(
  frame: ExtractedFrame
) {
  const bytes = await fs.readFile(frame.absolutePath);
  const blob = new Blob([bytes], {
    type: "image/jpeg",
  });

  const form = new FormData();

  form.append(
    "image",
    blob,
    frame.fileName
  );

  const baseUrl = process.env.AI_SERVER_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;
  const response = await fetch(
    `${baseUrl}/pose/detect`,
    {
      method: "POST",
      body: form,
      headers: process.env.AI_SERVER_TOKEN
        ? { Authorization: `Bearer ${process.env.AI_SERVER_TOKEN}` }
        : undefined,
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