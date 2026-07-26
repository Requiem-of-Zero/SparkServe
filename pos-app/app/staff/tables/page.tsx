import Link from "next/link";

import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { TableSessionFloorControls } from "@/app/staff/tables/table-session-floor-controls";
import { TableSessionTransferForm } from "@/app/staff/tables/table-session-transfer-form";
import { TableTransferApprovalForm } from "@/app/staff/tables/table-transfer-approval-form";
import { TablesLiveClient } from "@/app/staff/tables/tables-live-client";
import { requireActiveEmployee } from "@/lib/employee-auth";
import {
  OrderStatus,
  TableSessionStatus,
  TableSessionTransferStatus,
} from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { canManageFloorActions } from "@/lib/staff-floor-actions";
import {
  getTableFloorStatus,
  getTableFloorStatusLabel,
  type TableFloorStatus,
} from "@/lib/table-floor";

type FloorTable = Prisma.DiningTableGetPayload<{
  include: {
    sessions: {
      include: {
        checkouts: true;
        items: true;
        orders: true;
        participants: true;
      };
    };
  };
}>;

type PendingTransferRequest = Prisma.TableSessionTransferRequestGetPayload<{
  include: {
    fromTable: true;
    requestedByEmployee: {
      include: {
        user: true;
      };
    };
    tableSession: true;
    toTable: true;
  };
}>;

const unpaidOrderStatuses = new Set<OrderStatus>([
  OrderStatus.PENDING_OWNER_APPROVAL,
  OrderStatus.APPROVED,
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.READY_FOR_CHECKOUT,
]);

const statusStyles: Record<TableFloorStatus, string> = {
  AVAILABLE: "border-emerald-400/30 bg-emerald-950/25 text-emerald-200",
  OCCUPIED: "border-sky-400/30 bg-sky-950/25 text-sky-200",
  ORDERING: "border-[#ffd166]/40 bg-amber-950/30 text-[#ffd166]",
  IN_KITCHEN: "border-orange-400/40 bg-orange-950/30 text-orange-200",
  READY: "border-lime-400/40 bg-lime-950/25 text-lime-200",
  WAITING_FOR_PAYMENT: "border-rose-400/40 bg-rose-950/25 text-rose-200",
};

function formatTableLabel(table: {
  col: number;
  label: string | null;
  row: string;
}) {
  return table.label ?? `${table.row}${table.col}`;
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatShortDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatEmployeeName(employee: PendingTransferRequest["requestedByEmployee"]) {
  const structuredName = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ");

  return structuredName || employee.user.displayUsername || employee.user.name;
}

function getOpenSession(table: FloorTable) {
  return table.sessions[0] ?? null;
}

function summarizeTable(table: FloorTable) {
  const session = getOpenSession(table);
  const participants =
    session?.participants
      .toSorted((first, second) => {
        if (first.role !== second.role) {
          return first.role === "OWNER" ? -1 : 1;
        }

        return first.createdAt.getTime() - second.createdAt.getTime();
      })
      .map((participant) => ({
        displayName: participant.displayName,
        id: participant.id,
        joinedAt: participant.createdAt,
        role: participant.role,
      })) ?? [];
  const latestJoin = participants.at(-1)?.joinedAt ?? null;
  const openCartQuantity =
    session?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const unpaidTotalCents =
    session?.orders.reduce(
      (sum, order) =>
        unpaidOrderStatuses.has(order.status) ? sum + order.totalCents : sum,
      0,
    ) ?? 0;
  const status = getTableFloorStatus({
    hasOpenSession: Boolean(session),
    openCartQuantity,
    participantCount: participants.length,
    orderStatuses: session?.orders.map((order) => order.status) ?? [],
    checkoutStatuses:
      session?.checkouts.map((checkout) => checkout.status) ?? [],
  });

  return {
    id: table.id,
    isOverCapacity: Boolean(
      session?.attendeeCount && participants.length > session.attendeeCount,
    ),
    label: formatTableLabel(table),
    latestJoin,
    openCartQuantity,
    participantCount: participants.length,
    participants,
    session,
    status,
    submittedOrderCount:
      session?.orders.filter((order) => order.status !== OrderStatus.DRAFT)
        .length ?? 0,
    unpaidTotalCents,
  };
}

export default async function StaffTablesPage() {
  const employee = await requireActiveEmployee();

  const canTransferTables = canManageFloorActions(employee.role);
  const [restaurant, tables, pendingTransferRequests] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { id: 1 } }),
    prisma.diningTable.findMany({
      where: {
        active: true,
      },
      include: {
        sessions: {
          where: {
            status: TableSessionStatus.OPEN,
          },
          include: {
            checkouts: true,
            items: true,
            orders: true,
            participants: true,
          },
          orderBy: {
            openedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: [{ row: "asc" }, { col: "asc" }],
    }),
    canTransferTables
      ? prisma.tableSessionTransferRequest.findMany({
          where: {
            status: TableSessionTransferStatus.PENDING,
          },
          include: {
            fromTable: true,
            requestedByEmployee: {
              include: {
                user: true,
              },
            },
            tableSession: true,
            toTable: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        })
      : Promise.resolve([]),
  ]);
  const restaurantName = restaurant?.name ?? "Restaurant";
  const tableSummaries = tables.map(summarizeTable);
  const availableCount = tableSummaries.filter(
    (table) => table.status === "AVAILABLE",
  ).length;
  const unpaidTotalCents = tableSummaries.reduce(
    (sum, table) => sum + table.unpaidTotalCents,
    0,
  );
  const activeSessionCount = tableSummaries.filter(
    (table) => table.session,
  ).length;
  const joinedParticipantCount = tableSummaries.reduce(
    (sum, table) => sum + table.participantCount,
    0,
  );

  return (
    <main className="min-h-screen bg-[#100b0b] px-4 py-8 text-[#fff7ed] sm:px-6">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <RestaurantBrandLink
              logoUrl={restaurant?.logoUrl}
              name={restaurantName}
              markClassName="h-9 w-9"
            />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a1a]">
              Staff floor
            </p>
            <h1 className="mt-2 text-3xl font-bold">Table floor view</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Watch active table sessions, cart activity, kitchen progress, and
              unpaid totals from one dining room screen.
            </p>
            <TablesLiveClient />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/staff/kitchen"
              className="rounded-md border border-orange-200/20 px-3 py-2 text-sm text-zinc-200 hover:bg-orange-100/10"
            >
              Kitchen queue
            </Link>
            <Link
              href="/staff"
              className="rounded-md border border-orange-200/20 px-3 py-2 text-sm text-zinc-200 hover:bg-orange-100/10"
            >
              Staff dashboard
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FloorMetric label="Tables" value={tables.length.toString()} />
          <FloorMetric
            label="Active sessions"
            value={activeSessionCount.toString()}
          />
          <FloorMetric
            label="Joined guests"
            value={joinedParticipantCount.toString()}
          />
          <FloorMetric label="Available" value={availableCount.toString()} />
          <FloorMetric label="Open unpaid" value={formatPrice(unpaidTotalCents)} />
        </section>

        {canTransferTables ? (
          <PendingTransferRequestsPanel
            transferRequests={pendingTransferRequests}
          />
        ) : null}

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Dining room</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Layout editing will move to owner table settings; this screen
                is the live staff orientation layer.
              </p>
            </div>
            <StatusLegend />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tableSummaries.map((table) => (
              <TableStatusCard
                key={table.session?.id ?? table.label}
                canTransferTables={canTransferTables}
                tableSummaries={tableSummaries}
                table={table}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function PendingTransferRequestsPanel({
  transferRequests,
}: {
  transferRequests: PendingTransferRequest[];
}) {
  return (
    <section className="mt-8 rounded-lg border border-[#ffd166]/25 bg-amber-950/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffd166]">
            Manager approvals
          </p>
          <h2 className="mt-2 text-xl font-bold">Table move requests</h2>
        </div>
        <span className="rounded-full border border-[#ffd166]/40 px-3 py-1 text-sm text-[#ffd166]">
          {transferRequests.length} pending
        </span>
      </div>

      {transferRequests.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          No table move requests are waiting for approval.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {transferRequests.map((transferRequest) => (
            <article
              key={transferRequest.id}
              className="rounded-md border border-orange-200/10 bg-[#100b0b] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-500">
                    Request #{transferRequest.id}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {formatTableLabel(transferRequest.fromTable)} to{" "}
                    {formatTableLabel(transferRequest.toTable)}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Session #{transferRequest.tableSessionId} requested by{" "}
                    {formatEmployeeName(transferRequest.requestedByEmployee)}
                  </p>
                </div>
                <span className="rounded border border-[#ffd166]/40 px-2 py-1 text-xs text-[#ffd166]">
                  {formatTime(transferRequest.createdAt)}
                </span>
              </div>
              <TableTransferApprovalForm
                transferRequestId={transferRequest.id}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FloorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-orange-200/10 bg-[#1a0f0b] p-4 shadow-lg shadow-black/20">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-1 text-xs">
      {(Object.keys(statusStyles) as TableFloorStatus[]).map((status) => (
        <span
          key={status}
          className={`shrink-0 rounded-full border px-2 py-1 ${statusStyles[status]}`}
        >
          {getTableFloorStatusLabel(status)}
        </span>
      ))}
    </div>
  );
}

function TableStatusCard({
  canTransferTables,
  tableSummaries,
  table,
}: {
  canTransferTables: boolean;
  tableSummaries: ReturnType<typeof summarizeTable>[];
  table: ReturnType<typeof summarizeTable>;
}) {
  const session = table.session;
  const hasCustomerSession = Boolean(session && table.status !== "AVAILABLE");
  const destinationTables = tableSummaries.map((destinationTable) => {
    const isCurrentTable = destinationTable.id === table.id;
    const isAvailable = destinationTable.status === "AVAILABLE";

    return {
      disabledReason: isCurrentTable
        ? "current table"
        : isAvailable
          ? undefined
          : "occupied",
      id: destinationTable.id,
      isAvailable: isAvailable && !isCurrentTable,
      label: destinationTable.label,
      statusLabel: getTableFloorStatusLabel(destinationTable.status),
    };
  });

  return (
    <article className="rounded-lg border border-orange-200/10 bg-[#1a0f0b] p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Table
          </p>
          <h3 className="mt-1 text-2xl font-bold">{table.label}</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[table.status]}`}
        >
          {getTableFloorStatusLabel(table.status)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <TableFact label="Attendees" value={session?.attendeeCount ?? "Unset"} />
        <TableFact
          label="Joined"
          value={
            session?.attendeeCount
              ? `${table.participantCount}/${session.attendeeCount}`
              : table.participantCount
          }
        />
        <TableFact label="Cart items" value={table.openCartQuantity} />
        <TableFact label="Orders" value={table.submittedOrderCount} />
      </div>

      {table.isOverCapacity ? (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          This session is over the attendee limit. New devices will be blocked
          until staff updates the party size or removes stale participants.
        </p>
      ) : null}

      <div className="mt-5 rounded-md border border-orange-200/10 bg-[#100b0b] p-3">
        {session ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-zinc-400">
                {hasCustomerSession ? "Session" : "QR placeholder"}
              </span>
              <span className="font-semibold text-zinc-100">#{session.id}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-zinc-400">Opened</span>
              <span className="text-zinc-200">{formatTime(session.openedAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-zinc-400">Latest join</span>
              <span className="text-zinc-200">
                {table.latestJoin ? formatTime(table.latestJoin) : "None"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-orange-200/10 pt-2 text-sm">
              <span className="text-zinc-400">Unpaid total</span>
              <span className="font-semibold text-[#ffd166]">
                {formatPrice(table.unpaidTotalCents)}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            No active QR session at this table.
          </p>
        )}
      </div>

      {table.participants.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Joined session
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {table.participants.map((participant) => (
              <span
                key={participant.id}
                title={`Joined ${formatShortDateTime(participant.joinedAt)}`}
                className={`rounded-full border px-2 py-1 text-xs ${
                  participant.role === "OWNER"
                    ? "border-[#ffd166]/40 bg-amber-950/30 text-[#ffd166]"
                    : "border-orange-200/10 bg-[#100b0b] text-zinc-300"
                }`}
              >
                {participant.displayName}
                {participant.role === "OWNER" ? " owner" : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {hasCustomerSession ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/table/${session.publicToken}`}
            className="rounded-md bg-[#ff6a1a] px-3 py-2 text-sm font-semibold text-[#160b08] hover:bg-[#ffd166]"
          >
            Open table
          </Link>
          <Link
            href="/staff/kitchen"
            className="rounded-md border border-orange-200/20 px-3 py-2 text-sm text-zinc-200 hover:bg-orange-100/10"
          >
            View kitchen
          </Link>
        </div>
      ) : null}

      {hasCustomerSession ? (
        <TableSessionTransferForm
          destinationTables={destinationTables}
          requiresApproval={!canTransferTables}
          tableSessionId={session.id}
        />
      ) : null}

      {hasCustomerSession && canTransferTables ? (
        <TableSessionFloorControls
          attendeeCount={session.attendeeCount}
          tableSessionId={session.id}
        />
      ) : null}
    </article>
  );
}

function TableFact({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-orange-200/10 bg-[#100b0b] p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
