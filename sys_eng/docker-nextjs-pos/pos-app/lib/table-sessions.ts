import { randomBytes } from "node:crypto";

import { TableSessionStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// Public tokens go in customer QR/session URLs, so they need to be hard to guess.
function createPublicToken() {
  return randomBytes(18).toString("base64url");
}

// Token collisions are extremely unlikely, but publicToken is unique in the DB,
// so check before using one instead of relying on a failed insert.
async function createUniquePublicToken() {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const publicToken = createPublicToken();

    const existingSession = await prisma.tableSession.findUnique({
      where: { publicToken },
    });

    if (!existingSession) {
      return publicToken;
    }
  }

  throw new Error("Could not create a unique table session token.");
}

// Reuse the current OPEN session for a table, or create the visit/session
// customers will share after scanning that table's QR code.
export async function getOrCreateOpenTableSession(tableId: number) {
  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
  });

  if (!table || !table.active) {
    throw new Error("Dining table not found.");
  }

  const openSession = await prisma.tableSession.findFirst({
    where: {
      tableId,
      status: TableSessionStatus.OPEN,
    },
    orderBy: {
      openedAt: "desc",
    },
  });

  // Everyone at the same table should join the same live cart/session.
  if (openSession) {
    return openSession;
  }

  return prisma.tableSession.create({
    data: {
      tableId,
      publicToken: await createUniquePublicToken(),
    },
  });
}

export async function getTableSessionByToken(publicToken: string) {
  const session = await prisma.tableSession.findUnique({
    where: { publicToken },
    include: {
      table: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          menuItem: {
            include: {
              translations: true,
            },
          },
        },
      },
      orders: {
        where: {
          paidAt: null,
          cancelledAt: null,
        },
        orderBy: { submittedAt: "asc" },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!session) {
    throw new Error("Table session not found.");
  }

  return session;
}
