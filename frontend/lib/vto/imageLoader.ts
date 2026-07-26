import path from "path";
import { promises as fs } from "fs";

export async function imageUrlToFile(
  imageUrl: string,
  fileName: string
): Promise<File> {

  const absolutePath = path.join(
    process.cwd(),
    "public",
    imageUrl
  );

  const buffer = await fs.readFile(
    absolutePath
  );

  return new File(
    [buffer],
    fileName,
    {
      type: "image/jpeg",
    }
  );
}