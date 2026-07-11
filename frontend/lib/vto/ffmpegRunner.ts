import { spawn } from "child_process";
import fs from "fs";

const ffmpegPath = process.env.FFMPEG_PATH;

export async function runFFmpeg(
  args: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      return reject(
        new Error(
          "FFMPEG_PATH is not configured."
        )
      );
    }

    if (!fs.existsSync(ffmpegPath)) {
      return reject(
        new Error(
          `FFmpeg executable not found:\n${ffmpegPath}`
        )
      );
    }

    console.log("Using FFmpeg:", ffmpegPath);

    const ffmpeg = spawn(ffmpegPath, args, {
      windowsHide: true,
    });

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("error", reject);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `FFmpeg exited with code ${code}\n\n${stderr}`
          )
        );
      }
    });
  });
}