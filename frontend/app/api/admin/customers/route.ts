import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const customers = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return jsonOk({ customers });
  } catch (error) {
    return jsonError(error);
  }
}
