"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function getAddresses() {
  const user = await getCurrentUser();

  if (!user) return [];

  return await prisma.address.findMany({
    where: {
      userId: user.userId,
    },
    orderBy: [
      {
        isDefault: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function createAddress(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isDefault =
    formData.get("isDefault") === "on";

  // If this is the user's first address,
  // automatically make it default.
  const existingAddresses =
    await prisma.address.count({
      where: {
        userId: user.userId,
      },
    });

  const finalDefault =
    existingAddresses === 0 || isDefault;

  if (finalDefault) {
    await prisma.address.updateMany({
      where: {
        userId: user.userId,
      },
      data: {
        isDefault: false,
      },
    });
  }

  await prisma.address.create({
    data: {
      userId: user.userId,
      fullName:
        formData.get("fullName") as string,
      phone:
        formData.get("phone") as string,
      addressLine1:
        formData.get(
          "addressLine1"
        ) as string,
      addressLine2:
        (formData.get(
          "addressLine2"
        ) as string) || null,
      city:
        formData.get("city") as string,
      state:
        formData.get("state") as string,
      postalCode:
        formData.get(
          "postalCode"
        ) as string,
      country:
        formData.get("country") as string,
      isDefault: finalDefault,
    },
  });

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
  redirect("/profile/addresses");
}

export async function deleteAddress(id: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const address =
    await prisma.address.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

  if (!address) {
    return;
  }

  await prisma.address.delete({
    where: {
      id,
    },
  });

  // If default address was deleted,
  // automatically promote the newest one.
  if (address.isDefault) {
    const nextAddress =
      await prisma.address.findFirst({
        where: {
          userId: user.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (nextAddress) {
      await prisma.address.update({
        where: {
          id: nextAddress.id,
        },
        data: {
          isDefault: true,
        },
      });
    }
  }

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
}

export async function setDefaultAddress(id: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await prisma.$transaction([
    prisma.address.updateMany({
      where: {
        userId: user.userId,
      },
      data: {
        isDefault: false,
      },
    }),

    prisma.address.update({
      where: {
        id,
      },
      data: {
        isDefault: true,
      },
    }),
  ]);

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
}