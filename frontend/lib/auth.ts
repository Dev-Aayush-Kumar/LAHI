import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("lahi_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload =
      await verifySessionToken(token);

    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}