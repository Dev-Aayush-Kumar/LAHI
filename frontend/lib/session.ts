import { SignJWT, jwtVerify } from "jose";

import { SESSION_DURATION } from "@/constants/auth";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(payload: {
  userId: string;
  email: string;
  role?: string;
  sv?: number;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload;
}
