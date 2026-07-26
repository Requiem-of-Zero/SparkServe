"use client";

import { useTableIdentity } from "./table-identity-context";

// Non-owner guests see this while the table owner has not verified the session.
export function TableGuestWaitingPanel() {
  const { canOrder, participantRole } = useTableIdentity();

  if (canOrder || participantRole !== "GUEST") {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Waiting for table owner
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">
        Ordering opens after owner confirmation
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        The current table owner needs to confirm the session before ordering
        opens. If ownership should move to you, ask the owner to send a transfer
        request.
      </p>
    </div>
  );
}
