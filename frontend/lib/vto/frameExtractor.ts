import fs from "fs/promises";
import path from "path";

import { runFFmpeg } from "./ffmpegRunner";

export type ExtractedFrame = {
  fileName: string;
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
    "frames"
  );

  await fs.mkdir(frameFolder, {
    recursive: true,
  });

  // Clean previous extracted frames
  const existingFiles = await fs.readdir(frameFolder);

  await Promise.all(
    existingFiles.map((file) =>
      fs.unlink(path.join(frameFolder, file))
    )
  );

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

  const frames: ExtractedFrame[] = files.map(
    (file, index) => ({
      fileName: file,
      imageUrl: `/uploads/frames/${file}`,
      timestampMs: index * 500,
    })
  );

  console.log(
    `Extracted ${frames.length} frame(s)`
  );

  return frames;
}