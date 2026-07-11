import path from "path";

import { scoreFrame } from "./frameScore";
import { ExtractedFrame } from "./poseSelector";

export async function rankFrames(
  frames: ExtractedFrame[]
): Promise<ExtractedFrame[]> {
  const scored = await Promise.all(
    frames.map(async (frame) => {
      const absolutePath = path.join(
        process.cwd(),
        "public",
        frame.imageUrl.replace(/^\/+/, "")
      );

      const score = await scoreFrame(
        absolutePath
      );

      return {
        ...frame,
        qualityScore:
          score.sharpness +
          score.brightness * 0.05,
      };
    })
  );

  return scored.sort(
    (a, b) =>
      (b.qualityScore ?? 0) -
      (a.qualityScore ?? 0)
  );
}