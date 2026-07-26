import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const models =
    await prisma.userModel.findMany({
      where: {
        userId: user.userId,
        status: "READY",
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return NextResponse.json({
    success: true,
    models,
  });
}