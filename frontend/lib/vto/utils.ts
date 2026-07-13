import { randomUUID } from "crypto";

export function createVideoFileName() {
  return `${randomUUID()}.mp4`;
}