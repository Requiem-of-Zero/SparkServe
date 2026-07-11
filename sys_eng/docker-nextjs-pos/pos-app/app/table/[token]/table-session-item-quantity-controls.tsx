"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTableIdentity } from "./table-identity-context";
import { tableSocket } from "./table-socket";

type CartAckResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

// Shared cart controls. Each +/- emits to the realtime server, which updates DB
// state and broadcasts the new quantity to every table participant.
export function TableSessionItemQuantityControls({
  token,
  itemId,
  quantity,
}: {
  token: string;
  itemId: number;
  quantity: number;
}) {
  const router = useRouter();
  const { canOrder, displayName, isReady } = useTableIdentity();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const controlsReady = hasMounted && isReady;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  function adjustItem(eventName: "cart:increment-item" | "cart:decrement-item") {
    // The shared cart stays locked until the table owner verifies the session.
    if (!controlsReady || !canOrder) {
      setError("Waiting for the table owner to confirm this session.");
      return;
    }

    setIsUpdating(true);
    setError(null);

    if (!tableSocket.connected) {
      tableSocket.connect();
    }

    tableSocket.emit(
      eventName,
      {
        token,
        itemId,
        guestName: displayName,
      },
      (response: CartAckResponse) => {
        setIsUpdating(false);

        if (!response.ok) {
          setError(response.message);
          return;
        }

        router.refresh();
      },
    );
  }

  return (
    <div className="text-right">
      <div className="flex h-9 items-center rounded-md border border-zinc-700">
        <button
          type="button"
          onClick={() => adjustItem("cart:decrement-item")}
          disabled={hasMounted ? isUpdating || !isReady || !canOrder : false}
          className="h-9 w-9 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Decrease item quantity"
        >
          -
        </button>
        <span className="w-8 text-center text-sm">{quantity}</span>
        <button
          type="button"
          onClick={() => adjustItem("cart:increment-item")}
          disabled={hasMounted ? isUpdating || !isReady || !canOrder : false}
          className="h-9 w-9 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Increase item quantity"
        >
          +
        </button>
      </div>

      {controlsReady && !canOrder ? (
        <p className="mt-1 text-xs text-amber-300">Owner confirmation needed.</p>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
