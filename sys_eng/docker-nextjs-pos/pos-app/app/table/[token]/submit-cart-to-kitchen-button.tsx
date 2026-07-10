"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  submitCartToKitchenAction,
  type SubmitKitchenState,
} from "./actions";
import { useTableIdentity } from "./table-identity-context";

const initialState: SubmitKitchenState = {
  status: "idle",
};

// Freezes the shared cart into a durable kitchen order and clears the cart.
export function SubmitCartToKitchenButton({ token }: { token: string }) {
  const router = useRouter();
  const { canOrder, participantPublicId, participantRole, isReady } =
    useTableIdentity();
  const [state, action, isPending] = useActionState(
    submitCartToKitchenAction,
    initialState,
  );
  const isOwner = participantRole === "OWNER";
  const canSubmit = isReady && canOrder && isOwner && Boolean(participantPublicId);

  useEffect(() => {
    if (state.status === "submitted") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="token" value={token} />
      <input
        type="hidden"
        name="participantPublicId"
        value={participantPublicId ?? ""}
      />
      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="w-full rounded-md bg-amber-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending..." : "Send cart to kitchen"}
      </button>
      {!isOwner ? (
        <p className="text-xs text-zinc-400">
          The verified table owner sends orders to the kitchen.
        </p>
      ) : null}
      {state.message ? (
        <p
          className={
            state.status === "error" ? "text-xs text-red-300" : "text-xs text-emerald-300"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
