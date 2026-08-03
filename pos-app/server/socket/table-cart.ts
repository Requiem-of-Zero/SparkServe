import { TableSessionParticipantRole } from "../../lib/generated/prisma/enums";
import {
  allowedSpiceNotes,
  sanitizeIngredientIds,
  sanitizeKitchenNote,
} from "../../lib/menu-customization";
import { prisma } from "../../lib/prisma";
import { canTableAcceptOrders } from "../../lib/table-owner-verification";

export type CartAckResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export type AddCartItemPayload = {
  token: string;
  menuItemId: number;
  quantity?: number;
  note?: string;
  removedIngredientIds?: number[];
  guestName?: string;
};

export type AdjustCartItemPayload = {
  token: string;
  itemId: number;
  guestName?: string;
};

// The realtime payloads use the translated menu name for notifications.
export function getMenuItemDisplayName(item: {
  menuItemId: number;
  menuItem: {
    translations: {
      name: string;
    }[];
  };
}) {
  return item.menuItem.translations[0]?.name ?? `Menu item #${item.menuItemId}`;
}

// Server-side order gate. This prevents a custom Socket.IO client from adding
// items before the table owner has verified the session phone/code.
export async function getOrderableTableSession(token: string) {
  const session = await prisma.tableSession.findUnique({
    where: { publicToken: token },
    include: {
      participants: {
        where: { role: TableSessionParticipantRole.OWNER },
        select: { phoneVerifiedAt: true },
        take: 1,
      },
    },
  });

  if (!session || session.status !== "OPEN") {
    return {
      ok: false,
      message: "Table session is not open.",
    } as const;
  }

  if (
    !canTableAcceptOrders({
      sessionStatus: session.status,
      ownerPhoneVerifiedAt: session.participants[0]?.phoneVerifiedAt,
    })
  ) {
    return {
      ok: false,
      message: "Table owner must verify this session before ordering.",
    } as const;
  }

  return {
    ok: true,
    session,
  } as const;
}

export async function resolveStructuredKitchenNote({
  menuItemId,
  rawNote,
}: {
  menuItemId: number;
  rawNote: unknown;
}) {
  const note = sanitizeKitchenNote(rawNote);

  if (!note || !allowedSpiceNotes.has(note)) {
    return null;
  }

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { spicy: true },
  });

  return menuItem?.spicy ? note : null;
}

export async function resolveRemovableIngredientIds({
  menuItemId,
  rawRemovedIngredientIds,
}: {
  menuItemId: number;
  rawRemovedIngredientIds: unknown;
}) {
  const removedIngredientIds = sanitizeIngredientIds(rawRemovedIngredientIds);

  if (removedIngredientIds.length === 0) {
    return [];
  }

  const removableIngredients = await prisma.menuItemIngredient.findMany({
    where: {
      menuItemId,
      ingredientId: { in: removedIngredientIds },
      removable: true,
      ingredient: {
        commonAllergen: true,
      },
    },
    orderBy: [{ sortOrder: "asc" }, { ingredient: { name: "asc" } }],
  });

  return removableIngredients.map((entry) => entry.ingredientId);
}
