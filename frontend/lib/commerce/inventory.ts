import type { PrismaClient } from "@/lib/generated/prisma/client";

import { AppError, ErrorCodes } from "@/lib/errors";

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type StockItem = {
  variantId: string;
  quantity: number;
};

type InventoryRow = {
  id: string;
  quantity: number;
  reserved: number;
};

export function availableStock(quantity: number, reserved: number) {
  return Math.max(quantity - reserved, 0);
}

async function lockInventory(tx: Db, variantId: string) {
  const rows = await tx.$queryRaw<InventoryRow[]>`
    SELECT id, quantity, reserved
    FROM "Inventory"
    WHERE "variantId" = ${variantId}
    FOR UPDATE
  `;

  const row = rows[0];
  if (!row) {
    throw new AppError(
      ErrorCodes.INSUFFICIENT_STOCK,
      "This item is not available.",
      409
    );
  }

  return row;
}

export async function assertAvailable(tx: Db, items: StockItem[]) {
  for (const item of items) {
    const row = await lockInventory(tx, item.variantId);
    if (availableStock(row.quantity, row.reserved) < item.quantity) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_STOCK,
        "One or more items are out of stock.",
        409
      );
    }
  }
}

export async function reserveStock(
  tx: Db,
  items: StockItem[],
  orderId: string
) {
  for (const item of items) {
    const row = await lockInventory(tx, item.variantId);
    if (availableStock(row.quantity, row.reserved) < item.quantity) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_STOCK,
        "One or more items are out of stock.",
        409
      );
    }

    await tx.inventory.update({
      where: { id: row.id },
      data: {
        reserved: {
          increment: item.quantity,
        },
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: row.id,
        variantId: item.variantId,
        orderId,
        type: "RESERVE",
        quantity: item.quantity,
        reason: "checkout",
      },
    });
  }
}

export async function releaseStock(
  tx: Db,
  items: StockItem[],
  orderId: string,
  reason: string
) {
  for (const item of items) {
    const row = await lockInventory(tx, item.variantId);
    const nextReserved = Math.max(row.reserved - item.quantity, 0);

    await tx.inventory.update({
      where: { id: row.id },
      data: { reserved: nextReserved },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: row.id,
        variantId: item.variantId,
        orderId,
        type: "RELEASE",
        quantity: item.quantity,
        reason,
      },
    });
  }
}

export async function decrementReserved(
  tx: Db,
  items: StockItem[],
  orderId: string
) {
  for (const item of items) {
    const row = await lockInventory(tx, item.variantId);
    const nextReserved = Math.max(row.reserved - item.quantity, 0);
    const nextQuantity = Math.max(row.quantity - item.quantity, 0);

    await tx.inventory.update({
      where: { id: row.id },
      data: {
        reserved: nextReserved,
        quantity: nextQuantity,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: row.id,
        variantId: item.variantId,
        orderId,
        type: "DECREMENT",
        quantity: item.quantity,
        reason: "payment_succeeded",
      },
    });
  }
}

export async function restoreStock(
  tx: Db,
  items: StockItem[],
  orderId: string,
  reason: string
) {
  for (const item of items) {
    const row = await lockInventory(tx, item.variantId);

    await tx.inventory.update({
      where: { id: row.id },
      data: {
        quantity: {
          increment: item.quantity,
        },
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: row.id,
        variantId: item.variantId,
        orderId,
        type: "RESTORE",
        quantity: item.quantity,
        reason,
      },
    });
  }
}
