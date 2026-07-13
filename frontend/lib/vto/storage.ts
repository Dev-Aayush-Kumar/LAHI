import path from "path";
import { promises as fs } from "fs";

export const UPLOAD_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads"
);

export async function ensureUploadFolders() {
  await fs.mkdir(path.join(UPLOAD_ROOT, "videos"), {
    recursive: true,
  });

  await fs.mkdir(path.join(UPLOAD_ROOT, "models"), {
    recursive: true,
  });

  await fs.mkdir(path.join(UPLOAD_ROOT, "frames"), {
    recursive: true,
  });

  await fs.mkdir(path.join(UPLOAD_ROOT, "canonical"), {
    recursive: true,
  });

  await fs.mkdir(path.join(UPLOAD_ROOT, "generated"), {
    recursive: true,
  });
}

export async function saveVideo(
  file: File,
  fileName: string
) {
  await ensureUploadFolders();

  const bytes = await file.arrayBuffer();

  const buffer = Buffer.from(bytes);

  const absolutePath = path.join(
    UPLOAD_ROOT,
    "videos",
    fileName
  );

  await fs.writeFile(
    absolutePath,
    buffer
  );

  return {
    absolutePath,

    publicUrl: `/uploads/videos/${fileName}`,
  };
}