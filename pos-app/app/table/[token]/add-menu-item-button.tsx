"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MenuItemDetailModal } from "@/app/components/menu-item-detail-modal";
import { useCartFlyAnimation } from "@/app/components/use-cart-fly-animation";
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
  const quickAddButtonRef = useRef<HTMLButtonElement>(null);
  const { animateItemToCart, cartFlyAnimation } = useCartFlyAnimation();
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

    await new Promise<void>((resolve, reject) => {
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
            reject(new Error(response.message));
            return;
          }

          router.refresh();
          resolve();
        },
      );
    });
  }

  async function quickAddItem() {
    await addItem({
      quantity: 1,
      note: "",
      removedIngredientIds: [],
    });
    await animateItemToCart(quickAddButtonRef.current, item);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          ref={quickAddButtonRef}
          type="button"
          onClick={quickAddItem}
          disabled={disabled || isAdding}
          className="inline-flex min-h-9 items-center rounded-md bg-emerald-500 px-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAdding ? "Adding..." : "Add"}
        </button>

        <MenuItemDetailModal
          item={item}
          addLabel={isAdding ? "Adding..." : "Add to shared cart"}
          disabled={disabled || isAdding}
          disabledMessage="Waiting for the table owner to confirm this session."
          onAdd={addItem}
        >
          <span className="inline-flex min-h-9 items-center rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
            Customize
          </span>
        </MenuItemDetailModal>
      </div>

      {isReady && !canOrder ? (
        <p className="text-xs text-amber-300">
          Waiting for table owner confirmation.
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {cartFlyAnimation}
    </div>
  );
}
