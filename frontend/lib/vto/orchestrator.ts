import { generateFrames } from "./frameExtractor";
import { selectCanonicalFrames } from "./poseSelector";
import { saveCanonicalImage } from "./storage";
import { aiLog } from "./logger";
import fs from "fs/promises";
import path from "path";

export type PreprocessingResult = {
  frontImageUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  backImageUrl?: string;
};

export async function preprocessVideo(
  videoPath: string
): Promise<PreprocessingResult> {

  aiLog(
    "PREPROCESSING",
    "Pipeline Started"
  );

  const frames =
    await generateFrames(videoPath);

  aiLog(
    "FRAME EXTRACTION",
    `${frames.length} frames extracted`
  );

  const poses =
    await selectCanonicalFrames(frames);

  aiLog(
    "POSE",
    "Canonical frame selection completed"
  );

  aiLog(
    "PREPROCESSING",
    "Pipeline Finished"
  );

  const front =
    poses.front
      ? await saveCanonicalImage(
          poses.front.absolutePath,
          poses.front.fileName
        )
      : undefined;

  const left =
    poses.left
      ? await saveCanonicalImage(
          poses.left.absolutePath,
          poses.left.fileName
        )
      : undefined;

  const right =
    poses.right
      ? await saveCanonicalImage(
          poses.right.absolutePath,
          poses.right.fileName
        )
      : undefined;

  const back =
    poses.back
      ? await saveCanonicalImage(
          poses.back.absolutePath,
          poses.back.fileName
        )
      : undefined;

  const result = {
    frontImageUrl: front?.publicUrl,
    leftImageUrl: left?.publicUrl,
    rightImageUrl: right?.publicUrl,
    backImageUrl: back?.publicUrl,
  };

  if (frames.length > 0) {
    await fs.rm(path.dirname(frames[0].absolutePath), {
      recursive: true,
      force: true,
    });
  }

  return result;
}