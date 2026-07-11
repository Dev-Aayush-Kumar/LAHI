import { generateFrames } from "./frameExtractor";
import { selectCanonicalFrames } from "./poseSelector";
import { aiLog } from "./logger";
export type PreprocessingResult = {
  frontImageUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  backImageUrl?: string;
};

export async function preprocessVideo(
  videoUrl: string
): Promise<PreprocessingResult> {
  aiLog(
    "PREPROCESSING",
    "Pipeline Started"
  );

  const frames = await generateFrames(videoUrl);

  aiLog(
    "FRAME EXTRACTION",
    `${frames.length} frames extracted`
  );

  const poses = await selectCanonicalFrames(frames);

  aiLog(
    "POSE",
    "Canonical frame selection completed"
  );

  aiLog(
    "PREPROCESSING",
    "Pipeline Finished"
  );

  return {
    frontImageUrl: poses.front?.imageUrl,
    leftImageUrl: poses.left?.imageUrl,
    rightImageUrl: poses.right?.imageUrl,
    backImageUrl: poses.back?.imageUrl,
  };
}