import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
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

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId as string,
      },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
    };
  } catch {
    return null;
  }
}