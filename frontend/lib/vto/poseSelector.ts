import type { ExtractedFrame } from "./frameExtractor";

import { rankFrames } from "./frameRanker";

export type { ExtractedFrame };

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
   * Sprint 4
   *
   * Current:
   * ✓ ranks frames using brightness + sharpness
   * ✓ chooses temporary canonical frames
   *
   * Sprint 5:
   * • MediaPipe orientation
   * • Face confidence
   * • Body confidence
   * • Occlusion score
   */

  console.log(
    `Pose selector received ${frames.length} frame(s)`
  );

  if (frames.length === 0) {
    return {};
  }

  const rankedFrames =
    await rankFrames(frames);

  console.log(
    "Highest quality score:",
    rankedFrames[0]?.qualityScore
  );

  return {
    front: rankedFrames[0],
    left: rankedFrames[1],
    right: rankedFrames[2],
    back: rankedFrames[3],
  };
}