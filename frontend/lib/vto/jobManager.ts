import { randomUUID } from "crypto";

import { AIJob } from "./job";
import { AIJobStatus } from "./jobStatus";

const jobs = new Map<string, AIJob>();

export function createJob() {
  const id = randomUUID();

  jobs.set(id, {
    id,
    status: AIJobStatus.QUEUED,
    progress: 0,
  });

  return id;
}

export function updateJob(
  id: string,
  status: AIJobStatus,
  progress: number,
  message?: string
) {
  const job = jobs.get(id);

  if (!job) return;

  job.status = status;
  job.progress = progress;
  job.message = message;
}

export function getJob(id: string) {
  return jobs.get(id);
}