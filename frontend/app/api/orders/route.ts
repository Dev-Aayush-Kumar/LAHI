import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const orders = await prisma.order.findMany({
      where: { userId: user.userId },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return jsonOk({ orders });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    return GET();
  } catch (error) {
    return jsonError(error);
  }
}
