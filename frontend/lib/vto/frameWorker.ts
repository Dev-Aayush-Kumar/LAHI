import fs from "fs/promises";
import path from "path";

export type GeneratedFrame = {
  fileName: string;
  imageUrl: string;
};

export async function generatePlaceholderFrames(
  videoPath: string
): Promise<GeneratedFrame[]> {
  /**
   * Sprint 4
   *
   * Temporary implementation.
   *
   * Later this worker will:
   *
   * - decode video
   * - extract every frame
   * - save frames
   * - return metadata
   */

  const frameFolder = path.join(
    process.cwd(),
    "public",
    "uploads",
    "frames"
  );

  await fs.mkdir(frameFolder, {
    recursive: true,
  });

  const frames: GeneratedFrame[] = [];

  for (let i = 1; i <= 8; i++) {
    const name = `frame-${Date.now()}-${i}.jpg`;

    await fs.writeFile(
      path.join(frameFolder, name),
      ""
    );

    frames.push({
      fileName: name,
      imageUrl: `/uploads/frames/${name}`,
    });
  }

  console.log(
    `Generated ${frames.length} placeholder frames`
  );

  return frames;
}