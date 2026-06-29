import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const requestStart = performance.now();

  try {
    const token = request.cookies.get("lahi_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const jwtStart = performance.now();

    const payload = await verifySessionToken(token);

    console.log(
      "JWT Verification:",
      (performance.now() - jwtStart).toFixed(2),
      "ms"
    );

    const dbStart = performance.now();

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId as string,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImage: true,
      },
    });

    console.log(
      "Database Query:",
      (performance.now() - dbStart).toFixed(2),
      "ms"
    );

    console.log(
      "Total API Time:",
      (performance.now() - requestStart).toFixed(2),
      "ms"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid session.",
      },
      {
        status: 401,
      }
    );
  }
}