export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  CART_EMPTY: "CART_EMPTY",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  ADDRESS_INVALID: "ADDRESS_INVALID",
  COUPON_INVALID: "COUPON_INVALID",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  ORDER_NOT_CANCELLABLE: "ORDER_NOT_CANCELLABLE",
  ORDER_NOT_RETURNABLE: "ORDER_NOT_RETURNABLE",
  UPLOAD_INVALID: "UPLOAD_INVALID",
  UPLOAD_TOO_LARGE: "UPLOAD_TOO_LARGE",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
  AI_JOB_FAILED: "AI_JOB_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    status = 400,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toPublicError(error: unknown): {
  code: ErrorCode;
  message: string;
  status: number;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    };
  }

  return {
    code: ErrorCodes.INTERNAL_ERROR,
    message: "Something went wrong.",
    status: 500,
  };
}
