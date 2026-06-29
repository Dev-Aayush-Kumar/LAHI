import { SignJWT, jwtVerify } from "jose";

import { SESSION_DURATION } from "@/constants/auth";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET!
);

export async function createSessionToken(payload: {
  userId: string;
  email: string;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret);

  return payload;
}