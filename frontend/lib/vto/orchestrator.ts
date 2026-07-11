import { generateFrames } from "./frameExtractor";
import { selectCanonicalFrames } from "./poseSelector";

export type PreprocessingResult = {
  frontImageUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  backImageUrl?: string;
};

export async function preprocessVideo(
  videoUrl: string
): Promise<PreprocessingResult> {
  console.log("=================================");
  console.log("LAHI PREPROCESSING STARTED");
  console.log("=================================");

  const frames = await generateFrames(videoUrl);

  console.log(`Frames Generated: ${frames.length}`);

  const poses = await selectCanonicalFrames(frames);

  console.log("Pose Selection Complete");

  console.log("=================================");
  console.log("LAHI PREPROCESSING FINISHED");
  console.log("=================================");

  return {
    frontImageUrl: poses.front?.imageUrl,
    leftImageUrl: poses.left?.imageUrl,
    rightImageUrl: poses.right?.imageUrl,
    backImageUrl: poses.back?.imageUrl,
  };
}