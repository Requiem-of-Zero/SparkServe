"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  respondToTableSessionTransferAction,
  type TransferTableSessionState,
} from "@/app/staff/tables/actions";

const initialState: TransferTableSessionState = {
  status: "idle",
};

// Manager tablet prompt for approving or denying a requested table move.
export function TableTransferApprovalForm({
  transferRequestId,
}: {
  transferRequestId: number;
}) {
  const [state, formAction] = useActionState(
    respondToTableSessionTransferAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-2">
      <input
        type="hidden"
        name="transferRequestId"
        value={transferRequestId}
      />
      <div className="flex flex-wrap gap-2">
        <ApprovalButton decision="approve" label="Accept move" />
        <ApprovalButton decision="deny" label="Deny" />
      </div>
      {state.message ? (
        <p
          className={`text-xs ${
            state.status === "error" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function ApprovalButton({
  decision,
  label,
}: {
  decision: "approve" | "deny";
  label: string;
}) {
  const { pending } = useFormStatus();
  const isApprove = decision === "approve";

  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      disabled={pending}
      className={`rounded-md px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
        isApprove
          ? "bg-[#ff6a1a] text-[#160b08] hover:bg-[#ffd166]"
          : "border border-orange-200/20 text-zinc-200 hover:bg-orange-100/10"
      }`}
    >
      {pending ? "Reviewing..." : label}
    </button>
  );
}
