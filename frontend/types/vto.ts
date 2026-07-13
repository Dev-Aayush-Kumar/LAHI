export type UploadVideoResponse = {
  success: boolean;

  jobId?: string;

  modelId?: string;

  message: string;
};

export type ProcessingResponse = {
  success: boolean;

  status: string;

  progress: number;
};