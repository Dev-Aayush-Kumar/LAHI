import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError, ErrorCodes } from "@/lib/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const order = await prisma.order.findFirst({
      where: { id, userId: user.userId },
      include: { items: true, payments: true, returnRequests: true, refunds: true },
    });
    if (!order) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Order not found.", 404);
    }
    return jsonOk({ order });
  } catch (error) {
    return jsonError(error);
  }
}
