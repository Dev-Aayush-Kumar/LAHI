import { NextResponse } from "next/server";

import { AppError, toPublicError } from "@/lib/errors";
import { log } from "@/lib/logger";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status }
  );
}

export function jsonError(error: unknown, correlationId?: string) {
  const publicError = toPublicError(error);

  if (!(error instanceof AppError)) {
    log("error", "Unhandled error", {
      correlationId,
      name: error instanceof Error ? error.name : "unknown",
    });
  }

  return NextResponse.json(
    {
      success: false,
      code: publicError.code,
      message: publicError.message,
      correlationId,
    },
    { status: publicError.status }
  );
}
