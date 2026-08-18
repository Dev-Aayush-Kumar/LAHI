type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "authorization",
  "secret",
  "clientSecret",
  "cookie",
]);

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? "[redacted]" : redact(entry),
    ])
  );
}

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function log(
  level: LogLevel,
  message: string,
  fields: LogFields = {}
) {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    message,
  };
  const redacted = redact(fields);
  if (redacted && typeof redacted === "object" && !Array.isArray(redacted)) {
    Object.assign(payload, redacted);
  }

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}
