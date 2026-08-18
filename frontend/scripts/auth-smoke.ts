import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

async function main() {
  const marker = Date.now();
  const email = `stabilize-auth-${marker}@example.com`;
  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: "Auth Smoke User",
      email,
      passwordHash,
    },
  });

  try {
    const response = await fetch(
      "http://localhost:3000/api/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const body = await response.json();

    console.log(
      JSON.stringify(
        {
          status: response.status,
          success: !!body?.success,
          hasSessionCookie:
            !!response.headers.get("set-cookie"),
        },
        null,
        2
      )
    );

    if (!response.ok || !body?.success) {
      throw new Error("Login API smoke test failed.");
    }
  } finally {
    await prisma.cart.deleteMany({
      where: {
        userId: user.id,
      },
    });
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
