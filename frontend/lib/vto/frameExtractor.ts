import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { runFFmpeg } from "./ffmpegRunner";

export type ExtractedFrame = {
  fileName: string;
  absolutePath: string;
  imageUrl: string;
  timestampMs: number;
  angle?: string;
  qualityScore?: number;
};

export async function generateFrames(
  videoPath: string
): Promise<ExtractedFrame[]> {
  const frameFolder = path.join(
    process.cwd(),
    "public",
    "uploads",
    "frames",
    randomUUID()
  );

  await fs.mkdir(frameFolder, {
    recursive: true,
  });

  const outputPattern = path.join(
    frameFolder,
    "frame-%03d.jpg"
  );

  await runFFmpeg([
    "-y", // overwrite if anything exists
    "-i",
    videoPath,
    "-vf",
    "fps=2",
    outputPattern,
  ]);

  const files = (await fs.readdir(frameFolder))
    .filter((file) => file.endsWith(".jpg"))
    .sort();

  const frames: ExtractedFrame[] =
    files.map((file, index) => {

      const absolutePath = path.join(
        frameFolder,
        file
      );

      return {

        fileName: file,

        absolutePath,

        imageUrl: `/uploads/frames/${file}`,

        timestampMs: index * 500,

      };

    });
  console.log(
    `Extracted ${frames.length} frame(s)`
  );

  return frames;
}