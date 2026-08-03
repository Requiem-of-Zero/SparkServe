"use client";

import { useState } from "react";

import { useTableIdentity } from "./table-identity-context";
import { tableSocket } from "./table-socket";

type CheckoutRequestResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

// Lets any joined guest ask staff to close the table without exposing customer
// self-checkout on the QR ordering page.
export function NotifyWaiterCheckoutButton({ token }: { token: string }) {
  const { isReady, participantPublicId } = useTableIdentity();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canRequestCheckout = isReady && Boolean(participantPublicId);

  function notifyWaiter() {
    if (!participantPublicId) {
      setMessage("Join this table before requesting checkout.");
      return;
    }

    setIsSending(true);
    setMessage(null);

    if (!tableSocket.connected) {
      tableSocket.connect();
    }

    const timeoutId = window.setTimeout(() => {
      setIsSending(false);
      setMessage("Could not reach the staff tablet. Please ask your server.");
    }, 3000);

    tableSocket.emit(
      "table:checkout-requested",
      {
        participantPublicId,
        token,
      },
      (response: CheckoutRequestResponse) => {
        window.clearTimeout(timeoutId);
        setIsSending(false);
        setMessage(response.message);
      },
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={notifyWaiter}
        disabled={isSending || !canRequestCheckout}
        suppressHydrationWarning
        className="w-full rounded-md bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSending ? "Notifying waiter..." : "Notify waiter for checkout"}
      </button>
      <p className="text-xs text-zinc-400">
        A waiter will bring the restaurant payment device when the table is ready.
      </p>
      {message ? (
        <p
          className={
            message.startsWith("Could not") || message.startsWith("Join")
              ? "text-xs text-red-300"
              : "text-xs text-emerald-300"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
