import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const jobs = await prisma.tryOnJob.findMany({
      include: {
        user: { select: { email: true, fullName: true } },
        product: { select: { name: true, slug: true } },
        result: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return jsonOk({ jobs });
  } catch (error) {
    return jsonError(error);
  }
}
