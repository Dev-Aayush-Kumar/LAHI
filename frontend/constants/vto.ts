export const VTO = {
  MAX_VIDEO_SIZE_MB: 100,

  MAX_VIDEO_DURATION_SECONDS: 30,

  SUPPORTED_VIDEO_TYPES: [
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ],

  REQUIRED_FRAMES: 8,
} as const;