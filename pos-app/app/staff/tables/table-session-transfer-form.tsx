"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  requestTableSessionTransferAction,
  type TransferTableSessionState,
} from "@/app/staff/tables/actions";

type DestinationTable = {
  disabledReason?: string;
  id: number;
  isAvailable: boolean;
  label: string;
  statusLabel: string;
};

const initialState: TransferTableSessionState = {
  status: "idle",
};

// Staff floor form: managers move immediately, cashiers request approval.
export function TableSessionTransferForm({
  destinationTables,
  requiresApproval,
  tableSessionId,
}: {
  destinationTables: DestinationTable[];
  requiresApproval: boolean;
  tableSessionId: number;
}) {
  const [state, formAction] = useActionState(
    requestTableSessionTransferAction,
    initialState,
  );
  const hasDestinations = destinationTables.some((table) => table.isAvailable);

  return (
    <form
      action={formAction}
      className="mt-4 rounded-md border border-orange-200/10 bg-[#100b0b] p-3"
    >
      <input type="hidden" name="tableSessionId" value={tableSessionId} />
      <label
        htmlFor={`destinationTableId-${tableSessionId}`}
        className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500"
      >
        Move session
      </label>
      <div className="mt-2 flex gap-2">
        <select
          id={`destinationTableId-${tableSessionId}`}
          name="destinationTableId"
          required
          disabled={!hasDestinations}
          className="min-w-0 flex-1 rounded-md border border-orange-200/20 bg-[#090706] px-3 py-2 text-sm text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          defaultValue=""
        >
          <option value="" disabled>
            {hasDestinations ? "Choose table" : "No available tables"}
          </option>
          {destinationTables.map((destinationTable) => (
            <option
              key={destinationTable.id}
              value={destinationTable.id}
              disabled={!destinationTable.isAvailable}
            >
              {destinationTable.label} - {destinationTable.statusLabel}
              {destinationTable.disabledReason
                ? ` (${destinationTable.disabledReason})`
                : ""}
            </option>
          ))}
        </select>
        <TransferSubmitButton
          disabled={!hasDestinations}
          requiresApproval={requiresApproval}
        />
      </div>
      {state.message ? (
        <p
          className={`mt-2 text-xs ${
            state.status === "error" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {state.message}
        </p>
      ) : !hasDestinations ? (
        <p className="mt-2 text-xs text-amber-200">
          No available destination tables. Move customers only into an empty
          table or an unused QR placeholder.
        </p>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">
          {requiresApproval
            ? "Sends a manager approval request. The session token, cart, orders, and joined guests stay together after approval."
            : "Manager action. This moves the session immediately and writes an audit event."}
        </p>
      )}
    </form>
  );
}

function TransferSubmitButton({
  disabled,
  requiresApproval,
}: {
  disabled: boolean;
  requiresApproval: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-md border border-[#ffd166]/40 px-3 py-2 text-sm font-semibold text-[#ffd166] hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Sending..." : requiresApproval ? "Request" : "Move"}
    </button>
  );
}
