import sharp from "sharp";

export type FrameScore = {
  brightness: number;
  sharpness: number;
};

export async function scoreFrame(
  imagePath: string
): Promise<FrameScore> {

  const { data, info } =
    await sharp(imagePath)
      .greyscale()
      .raw()
      .toBuffer({
        resolveWithObject: true,
      });

  let sum = 0;

  for (const pixel of data) {
    sum += pixel;
  }

  const brightness =
    sum / (info.width * info.height);

  let variance = 0;

  for (const pixel of data) {
    variance += Math.pow(
      pixel - brightness,
      2
    );
  }

  variance /= data.length;

  return {
    brightness,
    sharpness: variance,
  };
}