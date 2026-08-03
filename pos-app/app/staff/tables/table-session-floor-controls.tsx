"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  cancelTableSessionAction,
  type FloorSessionControlState,
  updateTableSessionAttendeeCountAction,
} from "@/app/staff/tables/actions";

const initialState: FloorSessionControlState = {
  status: "idle",
};

// Manager/owner floor controls for correcting party size or cancelling a bad
// table session while keeping an audit trail of the action.
export function TableSessionFloorControls({
  attendeeCount,
  requiresManagerCode = false,
  tableSessionId,
}: {
  attendeeCount?: number | null;
  requiresManagerCode?: boolean;
  tableSessionId: number;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [attendeeState, attendeeAction] = useActionState(
    updateTableSessionAttendeeCountAction,
    initialState,
  );
  const [cancelState, cancelAction] = useActionState(
    cancelTableSessionAction,
    initialState,
  );

  return (
    <div className="mt-4 rounded-md border border-orange-200/10 bg-[#100b0b] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Floor controls
      </p>

      <form action={attendeeAction} className="mt-3 space-y-2">
        <input type="hidden" name="tableSessionId" value={tableSessionId} />
        <label
          htmlFor={`attendeeCount-${tableSessionId}`}
          className="text-xs text-zinc-400"
        >
          Party size
        </label>
        <div className="flex gap-2">
          <input
            id={`attendeeCount-${tableSessionId}`}
            name="attendeeCount"
            type="number"
            min={1}
            max={99}
            defaultValue={attendeeCount ?? 2}
            className="min-w-0 flex-1 rounded-md border border-orange-200/20 bg-[#090706] px-3 py-2 text-sm text-zinc-100"
            required
          />
          <AttendeeSubmitButton />
        </div>
        {requiresManagerCode ? (
          <ManagerCodeInput
            id={`managerApprovalCode-attendees-${tableSessionId}`}
            label="Manager code"
          />
        ) : null}
        {attendeeState.message ? (
          <p
            className={`text-xs ${
              attendeeState.status === "error"
                ? "text-red-300"
                : "text-emerald-300"
            }`}
          >
            {attendeeState.message}
          </p>
        ) : null}
      </form>

      <div className="mt-3 border-t border-orange-200/10 pt-3">
        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          className="w-full rounded-md border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/30"
        >
          Cancel session
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Cancelling closes this live QR session and writes an audit event.
        </p>
        {cancelState.message ? (
          <p
            className={`mt-2 text-xs ${
              cancelState.status === "error"
                ? "text-red-300"
                : "text-emerald-300"
            }`}
          >
            {cancelState.message}
          </p>
        ) : null}
      </div>

      {showCancelConfirm ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
        >
          <div className="w-full max-w-sm rounded-lg border border-red-500/40 bg-[#160b08] p-5 shadow-xl shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
              Confirm cancel
            </p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-100">
              Cancel table session #{tableSessionId}?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              This closes the active QR session, blocks further customer actions
              on it, and records the action in the audit log.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <form
                action={cancelAction}
                className="flex-1 space-y-3"
                onSubmit={() => setShowCancelConfirm(false)}
              >
                <input
                  type="hidden"
                  name="tableSessionId"
                  value={tableSessionId}
                />
                {requiresManagerCode ? (
                  <ManagerCodeInput
                    id={`managerApprovalCode-cancel-${tableSessionId}`}
                    label="Manager code"
                  />
                ) : null}
                <CancelSubmitButton />
              </form>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-md border border-orange-200/20 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-orange-100/10"
              >
                Keep session open
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ManagerCodeInput({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={id} className="block text-xs text-zinc-400">
      {label}
      <input
        id={id}
        name="managerApprovalCode"
        type="password"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoComplete="off"
        placeholder="6-digit code"
        className="mt-1 w-full rounded-md border border-orange-200/20 bg-[#090706] px-3 py-2 text-sm text-zinc-100"
        required
      />
    </label>
  );
}

function AttendeeSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-[#ffd166]/40 px-3 py-2 text-sm font-semibold text-[#ffd166] hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function CancelSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Cancelling..." : "Cancel session"}
    </button>
  );
}
