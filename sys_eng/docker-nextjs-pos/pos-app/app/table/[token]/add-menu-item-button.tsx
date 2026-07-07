"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTableIdentity } from "./table-identity-context";
import { tableSocket } from "./table-socket";

// Adds menu items through Socket.IO so every device at the table sees updates.
export function AddMenuItemButton({
  token,
  menuItemId,
}: {
  token: string;
  menuItemId: number;
}) {
  const router = useRouter();
  const { canOrder, displayName } = useTableIdentity();
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function changeQuantity(nextQuantity: number) {
    setQuantity(Math.min(20, Math.max(1, nextQuantity)));
  }

  function addItem() {
    // Guests cannot order until the owner confirms attendee count and phone.
    if (!canOrder) {
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
        menuItemId,
        quantity,
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
      <div className="flex items-center justify-end gap-2">
        <div className="flex h-9 items-center rounded-md border border-zinc-700">
          <button
            type="button"
            onClick={() => changeQuantity(quantity - 1)}
            className="h-9 w-9 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <button
            type="button"
            onClick={() => changeQuantity(quantity + 1)}
            className="h-9 w-9 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={isAdding || !canOrder}
          className="h-9 rounded-md bg-emerald-500 px-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isAdding ? "Adding..." : "Add"}
        </button>
      </div>

      {!canOrder ? (
        <p className="text-xs text-amber-300">
          Waiting for table owner confirmation.
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
