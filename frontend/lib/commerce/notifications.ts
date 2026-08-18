import type { PrismaClient } from "@/lib/generated/prisma/client";

export async function notify(
  db: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  input: {
    userId: string;
    orderId?: string;
    type: string;
    title: string;
    body: string;
  }
) {
  return db.notification.create({ data: input });
}
