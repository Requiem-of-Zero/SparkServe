"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  requestOwnershipTransferAction,
  respondToOwnershipTransferAction,
  type OwnershipTransferState,
} from "./actions";
import { useTableIdentity } from "./table-identity-context";
import { tableSocket } from "./table-socket";

type ParticipantOption = {
  publicId: string;
  displayName: string;
  role: string;
};

type PendingTransfer = {
  id: number;
  targetParticipantPublicId: string;
  requestedByDisplayName: string;
};

const initialState: OwnershipTransferState = {
  status: "idle",
};

// Lets the current owner offer ownership to another participant. The target must
// accept, which prevents random guests from claiming the table owner role.
export function TableOwnershipTransferPanel({
  token,
  participants,
  pendingTransfers,
}: {
  token: string;
  participants: ParticipantOption[];
  pendingTransfers: PendingTransfer[];
}) {
  const router = useRouter();
  const {
    displayName,
    participantPublicId,
    participantRole,
    setParticipantIdentity,
  } = useTableIdentity();
  const [requestState, requestAction, isRequestPending] = useActionState(
    requestOwnershipTransferAction,
    initialState,
  );
  const [responseState, responseAction, isResponsePending] = useActionState(
    respondToOwnershipTransferAction,
    initialState,
  );
  const transferForMe = pendingTransfers.find(
    (transfer) => transfer.targetParticipantPublicId === participantPublicId,
  );
  const transferOptions = participants.filter(
    (participant) =>
      participant.publicId !== participantPublicId &&
      participant.role !== "OWNER",
  );

  useEffect(() => {
    if (requestState.status === "requested") {
      // Notify the target's browser so the accept/deny prompt appears quickly.
      if (!tableSocket.connected) {
        tableSocket.connect();
      }

      tableSocket.emit("table:ownership-transfer-requested", { token });
      router.refresh();
    }
  }, [requestState.status, router, token]);

  useEffect(() => {
    if (
      (responseState.status === "accepted" ||
        responseState.status === "denied") &&
      participantPublicId
    ) {
      if (responseState.status === "accepted") {
        // Update local role immediately while the server-rendered page refreshes.
        setParticipantIdentity({
          displayName,
          participantPublicId,
          participantRole: "OWNER",
        });
      }

      if (!tableSocket.connected) {
        tableSocket.connect();
      }

      tableSocket.emit("table:ownership-transfer-responded", { token });
      router.refresh();
    }
  }, [
    displayName,
    participantPublicId,
    responseState.status,
    router,
    setParticipantIdentity,
    token,
  ]);

  if (!participantPublicId) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Ownership transfer
      </p>

      {participantRole === "OWNER" ? (
        <form action={requestAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="ownerParticipantPublicId"
            value={participantPublicId}
          />
          <label className="block flex-1">
            <span className="text-sm text-zinc-300">Transfer owner to</span>
            <select
              name="targetParticipantPublicId"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
              required
            >
              <option value="">Choose guest</option>
              {transferOptions.map((participant) => (
                <option key={participant.publicId} value={participant.publicId}>
                  {participant.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isRequestPending || transferOptions.length === 0}
            className="self-end rounded-md border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRequestPending ? "Sending..." : "Send request"}
          </button>
        </form>
      ) : null}

      {transferForMe ? (
        <form action={responseAction} className="mt-4 rounded-md border border-amber-800 bg-amber-950/30 p-4">
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="participantPublicId"
            value={participantPublicId}
          />
          <input type="hidden" name="transferId" value={transferForMe.id} />
          <p className="text-sm text-amber-100">
            {transferForMe.requestedByDisplayName} wants to transfer table
            ownership to you.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              name="decision"
              value="accept"
              disabled={isResponsePending}
              className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              Accept
            </button>
            <button
              type="submit"
              name="decision"
              value="deny"
              disabled={isResponsePending}
              className="rounded-md border border-zinc-600 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
            >
              Deny
            </button>
          </div>
        </form>
      ) : null}

      {requestState.message ? (
        <p
          className={`mt-3 text-sm ${
            requestState.status === "error" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {requestState.message}
        </p>
      ) : null}

      {responseState.message ? (
        <p
          className={`mt-3 text-sm ${
            responseState.status === "error" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {responseState.message}
        </p>
      ) : null}
    </div>
  );
}
