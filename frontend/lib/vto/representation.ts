export const HUMAN_REPRESENTATION = {
  available: [
    "front view image",
    "left view image",
    "right view image",
    "back view image",
    "source video",
    "segmentation mask when a provider returns one",
    "pose JSON when a pose provider returns one",
  ],
  planned: [
    "DensePose or equivalent UV maps",
    "3D body mesh reconstruction",
    "body measurements",
    "identity embeddings / features",
  ],
} as const;
