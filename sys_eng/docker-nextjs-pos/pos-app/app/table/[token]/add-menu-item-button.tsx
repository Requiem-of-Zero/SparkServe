"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MenuItemDetailModal } from "@/app/components/menu-item-detail-modal";
import type {
  CustomerMenuItem,
  MenuItemCustomization,
} from "@/lib/menu-display";
import { useTableIdentity } from "./table-identity-context";
import { tableSocket } from "./table-socket";

// Adds menu items through Socket.IO so every device at the table sees updates.
export function AddMenuItemButton({
  item,
  token,
}: {
  item: CustomerMenuItem;
  token: string;
}) {
  const router = useRouter();
  const { canOrder, displayName, isReady } = useTableIdentity();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !isReady || !canOrder;

  async function addItem(customization: MenuItemCustomization) {
    // Guests cannot order until the owner confirms attendee count and phone.
    if (disabled) {
      setError("Waiting for the table owner to confirm this session.");
      return;
    }

    setIsAdding(true);
    setError(null);

    if (!tableSocket.connected) {
      tableSocket.connect();
    }

    tableSocket.emit(
      "cart:add-item",
      {
        token,
        menuItemId: item.id,
        quantity: customization.quantity,
        note: customization.note,
        removedIngredientIds: customization.removedIngredientIds,
        guestName: displayName,
      },
      (response: { ok: true } | { ok: false; message: string }) => {
        setIsAdding(false);

        if (!response.ok) {
          setError(response.message);
          return;
        }

        router.refresh();
      },
    );
  }

  return (
    <div className="space-y-2">
      <MenuItemDetailModal
        item={item}
        addLabel={isAdding ? "Adding..." : "Add to shared cart"}
        disabled={disabled || isAdding}
        disabledMessage="Waiting for the table owner to confirm this session."
        onAdd={addItem}
      >
        <span
          className="inline-flex min-h-9 items-center rounded-md bg-emerald-500 px-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          suppressHydrationWarning
        >
          Customize
        </span>
      </MenuItemDetailModal>

      {isReady && !canOrder ? (
        <p className="text-xs text-amber-300">
          Waiting for table owner confirmation.
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
