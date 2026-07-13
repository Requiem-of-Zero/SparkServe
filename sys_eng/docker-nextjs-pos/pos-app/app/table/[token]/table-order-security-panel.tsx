"use client";

import { useActionState } from "react";
import {
  updateOrderVerificationPreferenceAction,
  type OrderSecurityState,
} from "./actions";
import { useTableIdentity } from "./table-identity-context";

const initialState: OrderSecurityState = {
  status: "idle",
};

// Lets the verified table owner switch between faster submits and per-order
// kitchen codes without redoing the initial phone verification flow.
export function TableOrderSecurityPanel({
  token,
  orderVerificationRequired,
}: {
  token: string;
  orderVerificationRequired: boolean;
}) {
  const { canOrder, participantPublicId, participantRole, isReady } =
    useTableIdentity();
  const [state, action, isPending] = useActionState(
    updateOrderVerificationPreferenceAction,
    initialState,
  );
  const canUpdate =
    isReady && canOrder && participantRole === "OWNER" && Boolean(participantPublicId);

  if (!canOrder || participantRole !== "OWNER") {
    return null;
  }

  return (
    <form
      action={action}
      className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <input type="hidden" name="token" value={token} />
      <input
        type="hidden"
        name="participantPublicId"
        value={participantPublicId ?? ""}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex items-start gap-3">
          <input
            name="orderVerificationRequired"
            type="checkbox"
            value="on"
            defaultChecked={orderVerificationRequired}
            className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950"
          />
          <span>
            <span className="block text-sm font-medium text-white">
              Require 6-digit approval for each kitchen order
            </span>
            <span className="mt-1 block text-xs text-zinc-400">
              Turn this off for faster ordering after the owner phone is verified.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending || !canUpdate}
          className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "mt-3 text-xs text-red-300"
              : "mt-3 text-xs text-emerald-300"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
