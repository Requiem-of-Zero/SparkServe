"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  requestTableSessionTransferAction,
  type TransferTableSessionState,
} from "@/app/staff/tables/actions";
import { TableSessionFloorControls } from "@/app/staff/tables/table-session-floor-controls";
import type { TableFloorStatus } from "@/lib/table-floor";

type FloorMapTable = {
  attendeeCount: number | null;
  col: number;
  id: number;
  isOverCapacity: boolean;
  label: string;
  openCartQuantity: number;
  ownerName: string | null;
  participantCount: number;
  participants: {
    displayName: string;
    id: number;
    role: string;
  }[];
  publicToken: string | null;
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

type FloorMapMode = "move-session" | "seat-guests";

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

function hasActiveCustomerSession(table: FloorMapTable) {
  return Boolean(table.sessionId && table.status !== "AVAILABLE");
}

// Touch-friendly floor map for moving an active session between physical tables.
export function StaffTableFloorMap({
  canManageFloorActions,
  tables,
}: {
  canManageFloorActions: boolean;
  tables: FloorMapTable[];
}) {
  const router = useRouter();
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
  const [mode, setMode] = useState<FloorMapMode>("move-session");
  const isSessionMoveMode = mode === "move-session";
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

  useEffect(() => {
    if (state.status === "approved" || state.status === "requested") {
      router.refresh();
    }
  }, [router, state.status]);

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
    if (!isSessionMoveMode) {
      return;
    }

    if (hasActiveCustomerSession(table)) {
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
    if (!isSessionMoveMode || !hasActiveCustomerSession(table)) {
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
          <h3 className="mt-1 text-lg font-semibold">Floor actions</h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Move a whole table session today. Guest-level seat moves are a
            later split/merge workflow because cart, owner approval, orders, and
            checkout are session-owned.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="grid grid-cols-2 rounded-md border border-orange-200/10 bg-[#0b0706] p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("move-session")}
              className={`rounded px-3 py-2 font-semibold ${
                mode === "move-session"
                  ? "bg-[#ff6a1a] text-[#160b08]"
                  : "text-zinc-300 hover:bg-orange-100/10"
              }`}
            >
              Move session
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("seat-guests");
                setSelectedSourceTableId(null);
                setSelectedSessionId(null);
              }}
              className={`rounded px-3 py-2 font-semibold ${
                mode === "seat-guests"
                  ? "bg-[#ff6a1a] text-[#160b08]"
                  : "text-zinc-300 hover:bg-orange-100/10"
              }`}
            >
              Seat guests
            </button>
          </div>
          <div className="rounded-md border border-orange-200/10 bg-[#0b0706] px-3 py-2 text-sm text-zinc-300">
            {selectedTable ? (
              <>
                Moving{" "}
                <span className="font-semibold text-[#ffd166]">
                  {selectedTable.label}
                </span>
              </>
            ) : isSessionMoveMode ? (
              "Select occupied table"
            ) : (
              "Guest moves planned"
            )}
          </div>
        </div>
      </div>

      {mode === "seat-guests" ? (
        <p className="mt-3 rounded-md border border-[#ffd166]/30 bg-amber-950/25 px-3 py-2 text-sm text-amber-100">
          Guest-level moves need split/merge rules so individual people, their
          items, and payment responsibility do not detach from the table session
          by accident.
        </p>
      ) : null}

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
                  <FloorMapTableCard
                    key={table.id}
                    canDrop={canDrop}
                    canManageFloorActions={canManageFloorActions}
                    isPending={isPending}
                    isSelected={isSelected}
                    isSessionMoveMode={isSessionMoveMode}
                    mode={mode}
                    onBeginDrag={beginDrag}
                    onDropSession={submitMove}
                    onSelectTable={selectTable}
                    onUnselect={() => {
                      if (!isPending) {
                        setSelectedSourceTableId(null);
                        setSelectedSessionId(null);
                      }
                    }}
                    selectedSessionId={selectedSessionId}
                    table={table}
                  />
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

function FloorMapTableCard({
  canDrop,
  canManageFloorActions,
  isPending,
  isSelected,
  isSessionMoveMode,
  mode,
  onBeginDrag,
  onDropSession,
  onSelectTable,
  onUnselect,
  selectedSessionId,
  table,
}: {
  canDrop: boolean;
  canManageFloorActions: boolean;
  isPending: boolean;
  isSelected: boolean;
  isSessionMoveMode: boolean;
  mode: FloorMapMode;
  onBeginDrag: (table: FloorMapTable) => void;
  onDropSession: (destinationTableId: number) => void;
  onSelectTable: (table: FloorMapTable) => void;
  onUnselect: () => void;
  selectedSessionId: number | null;
  table: FloorMapTable;
}) {
  const hasCustomerSession = hasActiveCustomerSession(table);

  return (
    <article
      draggable={Boolean(isSessionMoveMode && hasCustomerSession)}
      onDragStart={(event) => {
        if (!isSessionMoveMode || !hasCustomerSession || isPending) {
          event.preventDefault();
          return;
        }

        onBeginDrag(table);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(table.sessionId));
      }}
      onDragOver={(event) => {
        if (isSessionMoveMode && canDrop && !isPending) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (isSessionMoveMode && canDrop && !isPending) {
          onDropSession(table.id);
        }
      }}
      onDragEnd={onUnselect}
      className={`rounded-md border p-3 text-left transition ${
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
        isSessionMoveMode && hasCustomerSession
          ? "cursor-grab active:cursor-grabbing"
          : isSessionMoveMode && selectedSessionId
            ? "cursor-pointer"
            : "cursor-default"
      } ${isPending ? "opacity-70" : ""}`}
      style={{ gridColumn: table.col }}
    >
      <button
        type="button"
        disabled={isPending}
        onClick={() => onSelectTable(table)}
        className="w-full text-left disabled:cursor-wait"
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
              : hasCustomerSession
                ? "No owner joined"
                : "No active session"}
          </span>
          <span className="font-semibold">
            {formatPrice(table.unpaidTotalCents)}
          </span>
        </div>
      </button>

      {table.isOverCapacity ? (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
          Over party size. New devices are blocked until staff adjusts the
          party size or clears stale participants.
        </p>
      ) : null}

      {mode === "seat-guests" && table.participants.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-current/15 pt-2">
          {table.participants.map((participant) => (
            <span
              key={participant.id}
              className="rounded-full border border-current/20 bg-black/15 px-2 py-1 text-[0.65rem]"
            >
              {participant.displayName}
              {participant.role === "OWNER" ? " owner" : ""}
            </span>
          ))}
        </div>
      ) : null}

      {hasCustomerSession && table.publicToken ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-current/15 pt-3">
          <Link
            href={`/table/${table.publicToken}`}
            className="rounded-md bg-[#ff6a1a] px-3 py-2 text-xs font-semibold text-[#160b08] hover:bg-[#ffd166]"
          >
            Open table
          </Link>
          <Link
            href="/staff/kitchen"
            className="rounded-md border border-current/20 px-3 py-2 text-xs font-semibold hover:bg-black/15"
          >
            Kitchen
          </Link>
        </div>
      ) : null}

      {hasCustomerSession && table.sessionId && canManageFloorActions ? (
        <div className="mt-3">
          <TableSessionFloorControls
            attendeeCount={table.attendeeCount}
            tableSessionId={table.sessionId}
          />
        </div>
      ) : null}
    </article>
  );
}
