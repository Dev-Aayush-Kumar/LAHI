export type UploadPayload = {
  userId: string;

  modelName: string;

  relation?: string;

  videoUrl: string;
};

export type FrameAngle =
  | "front"
  | "front_left"
  | "left"
  | "back_left"
  | "back"
  | "back_right"
  | "right"
  | "front_right";

export type ExtractedFrame = {
  angle: FrameAngle;

  imageUrl: string;

  timestamp: number;

  qualityScore: number;
};

export type PoseValidationResult = {
  success: boolean;

  score: number;

  message?: string;
};

export type PipelineResult = {
  success: boolean;

  frames: ExtractedFrame[];

  validation: PoseValidationResult;
};