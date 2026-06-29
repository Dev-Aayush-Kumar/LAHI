import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session";

import { AUTH_COOKIE_NAME } from "@/constants/cookies";

import LogoutButton from "@/components/Profile/LogoutButton";

export default async function ProfilePage() {
  const cookieStore = await cookies();

  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  let payload;

  try {
    payload = await verifySessionToken(token);
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId as string,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-3xl font-bold text-white">
            {user.fullName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 className="text-4xl font-bold">
              {user.fullName}
            </h1>

            <p className="mt-2 text-gray-600">
              {user.email}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">
              Account Created
            </p>

            <p className="mt-2 font-semibold">
              {user.createdAt.toLocaleDateString()}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">
              Last Login
            </p>

            <p className="mt-2 font-semibold">
              {user.lastLoginAt
                ? user.lastLoginAt.toLocaleString()
                : "First Login"}
            </p>
          </div>
        </div>

        <div className="mt-10">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}