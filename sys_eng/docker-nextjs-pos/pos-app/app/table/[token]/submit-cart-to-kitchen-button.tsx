"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  requestKitchenOrderCodeAction,
  submitCartToKitchenAction,
  type SubmitKitchenState,
} from "./actions";
import { useTableIdentity } from "./table-identity-context";

const initialState: SubmitKitchenState = {
  status: "idle",
};

// Freezes the shared cart into a durable kitchen order and clears the cart.
export function SubmitCartToKitchenButton({
  token,
  orderVerificationRequired,
}: {
  token: string;
  orderVerificationRequired: boolean;
}) {
  const router = useRouter();
  const { canOrder, participantPublicId, participantRole, isReady } =
    useTableIdentity();
  const [requestState, requestAction, isRequestPending] = useActionState(
    requestKitchenOrderCodeAction,
    initialState,
  );
  const [submitState, submitAction, isSubmitPending] = useActionState(
    submitCartToKitchenAction,
    initialState,
  );
  const isOwner = participantRole === "OWNER";
  const hasParticipant = Boolean(participantPublicId);
  const canRequestCode = isReady && canOrder && isOwner && hasParticipant;
  const canSubmit = isReady && canOrder && hasParticipant;

  useEffect(() => {
    if (submitState.status === "submitted") {
      router.refresh();
    }
  }, [router, submitState.status]);

  return (
    <div className="mt-4 space-y-3 rounded-md border border-amber-900/70 bg-amber-950/20 p-3">
      {orderVerificationRequired ? (
        <form action={requestAction} className="space-y-2">
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="participantPublicId"
            value={participantPublicId ?? ""}
          />
          <button
            type="submit"
            disabled={isRequestPending || !canRequestCode}
            suppressHydrationWarning
            className="w-full rounded-md border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRequestPending ? "Sending code..." : "Send kitchen submit code"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-amber-100">
          Per-order verification is off for this table session.
        </p>
      )}

      {orderVerificationRequired && requestState.devCode ? (
        <p className="rounded-md border border-amber-700 bg-zinc-950 px-3 py-2 text-xs text-amber-100">
          Dev kitchen code:{" "}
          <span className="font-mono font-semibold">{requestState.devCode}</span>
        </p>
      ) : null}

      {orderVerificationRequired && requestState.message ? (
        <p
          className={
            requestState.status === "error"
              ? "text-xs text-red-300"
              : "text-xs text-amber-200"
          }
        >
          {requestState.message}
        </p>
      ) : null}

      <form action={submitAction} className="space-y-2">
        <input type="hidden" name="token" value={token} />
        <input
          type="hidden"
          name="participantPublicId"
          value={participantPublicId ?? ""}
        />
        {orderVerificationRequired ? (
          <input
            name="verificationCode"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit kitchen code"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            required
          />
        ) : null}
        <button
          type="submit"
          disabled={isSubmitPending || !canSubmit}
          suppressHydrationWarning
          className="w-full rounded-md bg-amber-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitPending ? "Sending..." : "Send cart to kitchen"}
        </button>
      </form>

      {orderVerificationRequired && !isOwner ? (
        <p className="text-xs text-zinc-400">
          Ask the verified table owner for the current kitchen submit code.
        </p>
      ) : null}
      {submitState.message ? (
        <p
          className={
            submitState.status === "error"
              ? "text-xs text-red-300"
              : "text-xs text-emerald-300"
          }
        >
          {submitState.message}
        </p>
      ) : null}
    </div>
  );
}
