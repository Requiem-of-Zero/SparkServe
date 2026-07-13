"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  requestOwnerPhoneVerificationAction,
  type OwnerVerificationState,
  verifyOwnerPhoneCodeAction,
} from "./actions";
import { useTableIdentity } from "./table-identity-context";
import { tableSocket } from "./table-socket";

const initialState: OwnerVerificationState = {
  status: "idle",
};

// First table owner confirms party size and phone before the shared cart can be
// submitted. SMS is stubbed with a dev code until a provider is wired in.
export function TableOwnerSetupPanel({
  token,
}: {
  token: string;
}) {
  const router = useRouter();
  const { canOrder, participantPublicId, participantRole } = useTableIdentity();
  const [requestState, requestAction, isRequestPending] = useActionState(
    requestOwnerPhoneVerificationAction,
    initialState,
  );
  const [verifyState, verifyAction, isVerifyPending] = useActionState(
    verifyOwnerPhoneCodeAction,
    initialState,
  );

  useEffect(() => {
    if (verifyState.status === "verified") {
      // Broadcast unlocks ordering for all devices currently viewing this table.
      if (!tableSocket.connected) {
        tableSocket.connect();
      }

      tableSocket.emit("table:owner-verified", { token });
      router.refresh();
    }
  }, [router, token, verifyState.status]);

  if (participantRole !== "OWNER") {
    return null;
  }

  if (canOrder) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/25 p-5">
        <p className="text-xs uppercase tracking-wide text-emerald-300">
          Session owner confirmed
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">
          Ordering is open
        </h2>
        <p className="mt-1 text-sm text-zinc-300">
          Guests connected to this table can now add items to the shared cart.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-amber-800 bg-amber-950/30 p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-amber-300">
          Session owner setup
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">
          Confirm this table
        </h2>
        <p className="mt-1 text-sm text-zinc-300">
          Set the party size and verify the owner phone before kitchen
          submissions require approval.
        </p>
      </div>

      <form action={requestAction} className="mt-4 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="token" value={token} />
        <input
          type="hidden"
          name="participantPublicId"
          value={participantPublicId ?? ""}
        />

        <label className="block">
          <span className="text-sm text-zinc-300">Attendees</span>
          <input
            name="attendeeCount"
            type="number"
            min={1}
            max={99}
            defaultValue={2}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm text-zinc-300">Owner phone</span>
          <input
            name="phoneNumber"
            type="tel"
            placeholder="555-123-4567"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            required
          />
        </label>

        <button
          type="submit"
          disabled={isRequestPending || !participantPublicId}
          className="rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-3"
        >
          {isRequestPending ? "Sending..." : "Send verification code"}
        </button>
      </form>

      {requestState.message ? (
        <p
          className={`mt-3 text-sm ${
            requestState.status === "error" ? "text-red-300" : "text-amber-100"
          }`}
        >
          {requestState.message}
        </p>
      ) : null}

      {requestState.devCode ? (
        <p className="mt-2 rounded-md border border-amber-700 bg-zinc-950 px-3 py-2 text-sm text-amber-100">
          Dev verification code:{" "}
          <span className="font-mono font-semibold">{requestState.devCode}</span>
        </p>
      ) : null}

      <form action={verifyAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input type="hidden" name="token" value={token} />
        <input
          type="hidden"
          name="participantPublicId"
          value={participantPublicId ?? ""}
        />
        <input
          name="verificationCode"
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit code"
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          required
        />
        <button
          type="submit"
          disabled={isVerifyPending || !participantPublicId}
          className="rounded-md border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isVerifyPending ? "Verifying..." : "Verify phone"}
        </button>
      </form>

      {verifyState.message ? (
        <p
          className={`mt-3 text-sm ${
            verifyState.status === "error" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {verifyState.message}
        </p>
      ) : null}
    </div>
  );
}
