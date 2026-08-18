import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session";
import { AUTH_COOKIE_NAME } from "@/constants/cookies";
import { AppError, ErrorCodes } from "@/lib/errors";

export type CurrentUser = {
  userId: string;
  email: string;
  role: string;
  sessionVersion: number;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId as string,
      },
      select: {
        id: true,
        email: true,
        role: true,
        sessionVersion: true,
        accountStatus: true,
      },
    });

    if (!user || user.accountStatus !== "ACTIVE") {
      return null;
    }

    const tokenVersion =
      typeof payload.sv === "number" ? payload.sv : user.sessionVersion;
    if (tokenVersion !== user.sessionVersion) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      "Please sign in to continue.",
      401
    );
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AppError(
      ErrorCodes.FORBIDDEN,
      "Administrator access is required.",
      403
    );
  }
  return user;
}
