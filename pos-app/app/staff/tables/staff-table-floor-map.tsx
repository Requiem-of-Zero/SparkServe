"use client";

import { useActionState, useMemo, useState, useTransition } from "react";

import {
  requestTableSessionTransferAction,
  type TransferTableSessionState,
} from "@/app/staff/tables/actions";
import type { TableFloorStatus } from "@/lib/table-floor";

type FloorMapTable = {
  attendeeCount: number | null;
  col: number;
  id: number;
  label: string;
  openCartQuantity: number;
  ownerName: string | null;
  participantCount: number;
  row: string;
  seats: number;
  sessionId: number | null;
  status: TableFloorStatus;
  statusLabel: string;
  submittedOrderCount: number;
  unpaidTotalCents: number;
};

const initialState: TransferTableSessionState = {
  status: "idle",
};

const statusStyles: Record<TableFloorStatus, string> = {
  AVAILABLE: "border-emerald-400/40 bg-emerald-950/25 text-emerald-100",
  OCCUPIED: "border-sky-400/40 bg-sky-950/25 text-sky-100",
  ORDERING: "border-[#ffd166]/50 bg-amber-950/35 text-[#ffd166]",
  IN_KITCHEN: "border-orange-400/50 bg-orange-950/35 text-orange-100",
  READY: "border-lime-400/50 bg-lime-950/30 text-lime-100",
  WAITING_FOR_PAYMENT: "border-rose-400/50 bg-rose-950/30 text-rose-100",
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function groupTablesByRow(tables: FloorMapTable[]) {
  return tables.reduce<Map<string, FloorMapTable[]>>((rows, table) => {
    const rowTables = rows.get(table.row) ?? [];

    rowTables.push(table);
    rows.set(table.row, rowTables);

    return rows;
  }, new Map());
}

function getCanDropSession({
  selectedSessionId,
  sourceTableId,
  table,
}: {
  selectedSessionId: number | null;
  sourceTableId: number | null;
  table: FloorMapTable;
}) {
  return (
    Boolean(selectedSessionId) &&
    table.status === "AVAILABLE" &&
    table.id !== sourceTableId
  );
}

// Touch-friendly floor map for moving an active session between physical tables.
export function StaffTableFloorMap({
  canManageFloorActions,
  tables,
}: {
  canManageFloorActions: boolean;
  tables: FloorMapTable[];
}) {
  const [state, formAction] = useActionState(
    requestTableSessionTransferAction,
    initialState,
  );
  const [isPending, startTransition] = useTransition();
  const [selectedSourceTableId, setSelectedSourceTableId] = useState<
    number | null
  >(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const rows = useMemo(() => {
    return Array.from(groupTablesByRow(tables).entries()).map(
      ([rowLabel, rowTables]) => ({
        maxCol: Math.max(...rowTables.map((table) => table.col), 1),
        rowLabel,
        tables: rowTables.toSorted((first, second) => first.col - second.col),
      }),
    );
  }, [tables]);
  const selectedTable = tables.find(
    (table) => table.id === selectedSourceTableId,
  );

  function submitMove(destinationTableId: number) {
    if (!selectedSessionId) {
      return;
    }

    const formData = new FormData();
    formData.set("tableSessionId", String(selectedSessionId));
    formData.set("destinationTableId", String(destinationTableId));

    startTransition(() => {
      formAction(formData);
    });
    setSelectedSourceTableId(null);
    setSelectedSessionId(null);
  }

  function selectTable(table: FloorMapTable) {
    if (table.sessionId) {
      setSelectedSourceTableId(table.id);
      setSelectedSessionId(table.sessionId);
      return;
    }

    if (
      getCanDropSession({
        selectedSessionId,
        sourceTableId: selectedSourceTableId,
        table,
      })
    ) {
      submitMove(table.id);
    }
  }

  function beginDrag(table: FloorMapTable) {
    if (!table.sessionId) {
      return;
    }

    setSelectedSourceTableId(table.id);
    setSelectedSessionId(table.sessionId);
  }

  return (
    <section className="mt-4 rounded-lg border border-orange-200/10 bg-[#140c09] p-4 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6a1a]">
            Live floor map
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            Drag a session to move tables
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Drag an occupied table, or tap it once on iPad and tap an available
            destination. The same audited move/request action is used
            underneath.
          </p>
        </div>
        <div className="rounded-md border border-orange-200/10 bg-[#0b0706] px-3 py-2 text-sm text-zinc-300">
          {selectedTable ? (
            <>
              Moving{" "}
              <span className="font-semibold text-[#ffd166]">
                {selectedTable.label}
              </span>
            </>
          ) : (
            "Select occupied table"
          )}
        </div>
      </div>

      {state.message ? (
        <p
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            state.status === "error"
              ? "border-red-400/30 bg-red-950/25 text-red-200"
              : "border-emerald-400/30 bg-emerald-950/25 text-emerald-200"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-4 space-y-4 overflow-x-auto pb-2">
        {rows.map((row) => (
          <div key={row.rowLabel} className="min-w-[42rem]">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded border border-orange-200/10 bg-[#0b0706] px-2 py-1 text-xs font-semibold text-zinc-400">
                Row {row.rowLabel}
              </span>
              <div className="h-px flex-1 bg-orange-200/10" />
            </div>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${row.maxCol}, minmax(9rem, 1fr))`,
              }}
            >
              {row.tables.map((table) => {
                const isSelected = table.id === selectedSourceTableId;
                const canDrop = getCanDropSession({
                  selectedSessionId,
                  sourceTableId: selectedSourceTableId,
                  table,
                });

                return (
                  <button
                    key={table.id}
                    type="button"
                    draggable={Boolean(table.sessionId)}
                    onClick={() => selectTable(table)}
                    onDragStart={(event) => {
                      beginDrag(table);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(
                        "text/plain",
                        String(table.sessionId ?? ""),
                      );
                    }}
                    onDragOver={(event) => {
                      if (canDrop) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (canDrop) {
                        submitMove(table.id);
                      }
                    }}
                    onDragEnd={() => {
                      if (!isPending) {
                        setSelectedSourceTableId(null);
                        setSelectedSessionId(null);
                      }
                    }}
                    className={`min-h-36 rounded-md border p-3 text-left transition ${
                      statusStyles[table.status]
                    } ${
                      isSelected
                        ? "ring-2 ring-[#ffd166] ring-offset-2 ring-offset-[#140c09]"
                        : ""
                    } ${
                      canDrop
                        ? "scale-[1.02] border-[#ffd166] bg-[#2a170c] shadow-lg shadow-amber-950/30"
                        : ""
                    } ${
                      table.sessionId
                        ? "cursor-grab active:cursor-grabbing"
                        : selectedSessionId
                          ? "cursor-pointer"
                          : "cursor-default"
                    } disabled:cursor-wait disabled:opacity-70`}
                    disabled={isPending}
                    style={{ gridColumn: table.col }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] opacity-70">
                          Table
                        </p>
                        <p className="mt-1 text-xl font-bold">{table.label}</p>
                      </div>
                      <span className="rounded-full border border-current/25 px-2 py-1 text-[0.65rem] font-semibold">
                        {table.statusLabel}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <span className="rounded border border-current/15 bg-black/15 px-2 py-1">
                        Seats {table.seats}
                      </span>
                      <span className="rounded border border-current/15 bg-black/15 px-2 py-1">
                        Joined{" "}
                        {table.attendeeCount
                          ? `${table.participantCount}/${table.attendeeCount}`
                          : table.participantCount}
                      </span>
                      <span className="rounded border border-current/15 bg-black/15 px-2 py-1">
                        Cart {table.openCartQuantity}
                      </span>
                      <span className="rounded border border-current/15 bg-black/15 px-2 py-1">
                        Orders {table.submittedOrderCount}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-current/15 pt-2 text-xs">
                      <span className="truncate opacity-80">
                        {table.ownerName
                          ? `Owner: ${table.ownerName}`
                          : table.sessionId
                            ? "No owner joined"
                            : "No active session"}
                      </span>
                      <span className="font-semibold">
                        {formatPrice(table.unpaidTotalCents)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {canManageFloorActions
          ? "Owner/manager drops move immediately and write an audit event."
          : "Staff drops create a manager approval request."}
      </p>
    </section>
  );
}
