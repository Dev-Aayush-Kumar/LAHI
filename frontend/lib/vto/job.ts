import { AIJobStatus } from "./jobStatus";

export type AIJob = {
  id: string;

  status: AIJobStatus;

  progress: number;

  message?: string;
};