import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { upsertReview } from "@/lib/commerce/reviews";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const review = await upsertReview(prisma, {
      userId: user.userId,
      productId: body.productId,
      rating: Number(body.rating),
      title: body.title,
      body: body.body,
    });
    return jsonOk({ review });
  } catch (error) {
    return jsonError(error);
  }
}
