import type { ExtractedFrame } from "./frameExtractor";

export type SelectedPose = {
  front?: ExtractedFrame;
  left?: ExtractedFrame;
  right?: ExtractedFrame;
  back?: ExtractedFrame;
};

export async function selectCanonicalFrames(
  frames: ExtractedFrame[]
): Promise<SelectedPose> {
  /**
   * Sprint 4 Placeholder
   *
   * Later this module will:
   * • detect body orientation
   * • score image quality
   * • remove blurry frames
   * • detect occlusions
   * • choose best front / left / right / back
   */

  console.log(
    `Pose selector received ${frames.length} frame(s)`
  );

  if (frames.length === 0) {
    return {};
  }

  // Temporary placeholder.
  // Sprint 5 will replace this with AI-based orientation detection.
  return {
    front: frames[0],
    left: frames[1],
    right: frames[2],
    back: frames[3],
  };
}