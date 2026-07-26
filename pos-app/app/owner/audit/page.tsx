import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { requireOwner } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMetadata(metadata: unknown) {
  if (!metadata) {
    return "No metadata";
  }

  return JSON.stringify(metadata, null, 2);
}

export default async function OwnerAuditPage() {
  await requireOwner();

  // Owner-facing audit viewer for recent sensitive employee actions.
  const [restaurant, auditEvents] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { id: 1 } }),
    prisma.auditEvent.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        employeeProfile: {
          include: { user: true },
        },
      },
    }),
  ]);
  const restaurantName = restaurant?.name ?? "Restaurant";

  return (
    <main className="min-h-screen bg-[#100b0b] px-4 py-8 text-[#fff7ed] sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <RestaurantBrandLink
              logoUrl={restaurant?.logoUrl}
              name={restaurantName}
              markClassName="h-9 w-9"
            />
            <Link href="/staff" className="text-sm text-zinc-400 hover:text-white">
              Back to staff dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Audit log</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Review recent staff-sensitive actions. This helps trace who
              changed menu data, created employees, or rotated private codes.
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-orange-200/10 bg-[#1a0f0b]">
          <div className="grid grid-cols-[160px_minmax(0,1fr)_160px] gap-3 border-b border-orange-200/10 bg-[#100b0b] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>When</span>
            <span>Action</span>
            <span>Employee</span>
          </div>

          {auditEvents.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              No audit events yet.
            </p>
          ) : null}

          <div className="divide-y divide-orange-200/10">
            {auditEvents.map((event) => (
              <details key={event.id} className="group px-4 py-4">
                <summary className="grid cursor-pointer grid-cols-[160px_minmax(0,1fr)_160px] gap-3 text-sm marker:text-[#ff6a1a]">
                  <span className="text-zinc-400">
                    {formatDate(event.createdAt)}
                  </span>
                  <span>
                    <span className="font-semibold text-white">
                      {event.action}
                    </span>
                    {event.entityType ? (
                      <span className="ml-2 text-zinc-500">
                        {event.entityType}
                        {event.entityId ? ` #${event.entityId}` : ""}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-zinc-300">
                    {event.employeeProfile?.user.displayUsername ??
                      event.employeeProfile?.user.name ??
                      "System"}
                  </span>
                </summary>
                <div className="mt-4 grid gap-4 rounded-md border border-orange-200/10 bg-[#100b0b] p-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Request
                    </p>
                    <p className="mt-2 text-zinc-300">
                      IP: {event.ipAddress ?? "unknown"}
                    </p>
                    <p className="mt-1 break-all text-zinc-500">
                      {event.userAgent ?? "No user agent"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Metadata
                    </p>
                    <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 text-xs text-zinc-300">
                      {formatMetadata(event.metadata)}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
