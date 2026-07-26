import Link from "next/link";

import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { KitchenLiveClient } from "@/app/staff/kitchen/kitchen-live-client";
import {
  markOrderReadyAction,
  markTakeoutReadyAction,
} from "@/app/staff/kitchen/actions";
import { requireActiveEmployee } from "@/lib/employee-auth";
import { OrderStatus, TakeoutSessionStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type KitchenOrder = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        menuItem: {
          include: {
            ingredients: {
              include: {
                ingredient: true;
              };
            };
          };
        };
      };
    };
    requestedByParticipant: true;
    tableSession: {
      include: {
        table: true;
      };
    };
  };
}>;

type KitchenTakeoutSession = Prisma.TakeoutSessionGetPayload<{
  include: {
    items: {
      include: {
        menuItem: {
          include: {
            translations: true;
            ingredients: {
              include: {
                ingredient: true;
              };
            };
          };
        };
      };
    };
  };
}>;

function formatTableLabel(order: KitchenOrder) {
  const table = order.tableSession.table;

  return table.label ?? `${table.row}${table.col}`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSubmittedTime(order: KitchenOrder) {
  return formatTime(order.submittedAt ?? order.createdAt);
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getRemovedIngredientNames({
  ingredients,
  removedIngredientIds,
}: {
  ingredients: { ingredientId: number; ingredient: { name: string } }[];
  removedIngredientIds: number[];
}) {
  return ingredients
    .filter((entry) => removedIngredientIds.includes(entry.ingredientId))
    .map((entry) => entry.ingredient.name)
    .join(", ");
}

export default async function KitchenPage() {
  await requireActiveEmployee();

  // The kitchen screen reads from submitted orders; realtime can later revalidate
  // this page when new orders arrive or statuses change.
  const [restaurant, orders, takeoutSessions] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { id: 1 } }),
    prisma.order.findMany({
      where: {
        status: OrderStatus.SENT_TO_KITCHEN,
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                ingredients: {
                  include: { ingredient: true },
                },
              },
            },
          },
        },
        tableSession: {
          include: {
            table: true,
          },
        },
        requestedByParticipant: true,
      },
      orderBy: {
        submittedAt: "asc",
      },
    }),
    prisma.takeoutSession.findMany({
      where: {
        status: {
          in: [TakeoutSessionStatus.SUBMITTED, TakeoutSessionStatus.PAID],
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                translations: true,
                ingredients: {
                  include: { ingredient: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "asc",
      },
    }),
  ]);
  const restaurantName = restaurant?.name ?? "Restaurant";
  const activeOrderCount = orders.length + takeoutSessions.length;

  return (
    <main className="min-h-screen bg-[#100b0b] px-4 py-8 text-[#fff7ed] sm:px-6">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <RestaurantBrandLink
              logoUrl={restaurant?.logoUrl}
              name={restaurantName}
              markClassName="h-9 w-9"
            />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a1a]">
              Staff kitchen
            </p>
            <h1 className="mt-2 text-3xl font-bold">Kitchen queue</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Submitted table and takeout orders appear here with item names,
              quantities, notes, and pickup/table context.
            </p>
            <KitchenLiveClient />
          </div>
          <Link
            href="/staff"
            className="rounded-md border border-orange-200/20 px-3 py-2 text-sm text-zinc-200 hover:bg-orange-100/10"
          >
            Staff dashboard
          </Link>
        </header>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Incoming orders</h2>
            <span className="rounded border border-[#ffd166]/30 px-2 py-1 text-sm text-[#ffd166]">
              {activeOrderCount} active
            </span>
          </div>

          {activeOrderCount === 0 ? (
            <div className="mt-4 rounded-lg border border-orange-200/10 bg-[#1a0f0b] p-6 text-zinc-400">
              No orders are waiting in the kitchen queue.
            </div>
          ) : (
            <div className="mt-4 space-y-8">
              <KitchenSection title="Dine-in" count={orders.length}>
                {orders.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} />
                ))}
              </KitchenSection>

              <KitchenSection title="Takeout" count={takeoutSessions.length}>
                {takeoutSessions.map((takeoutSession) => (
                  <KitchenTakeoutCard
                    key={takeoutSession.id}
                    takeoutSession={takeoutSession}
                  />
                ))}
              </KitchenSection>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function KitchenSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-semibold text-zinc-200">{title}</h3>
        <span className="rounded border border-orange-200/10 px-2 py-0.5 text-xs text-zinc-400">
          {count}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function KitchenOrderCard({ order }: { order: KitchenOrder }) {
  // Each card is one submitted kitchen order from a table session.
  const tableLabel = formatTableLabel(order);
  const requester = order.requestedByParticipant?.displayName ?? "Guest";

  return (
    <article className="rounded-lg border border-orange-200/10 bg-[#1a0f0b] p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6a1a]">
            Table {tableLabel}
          </p>
          <h3 className="mt-2 text-2xl font-bold">Order #{order.id}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Submitted {formatSubmittedTime(order)} by {requester}
          </p>
        </div>
        <div className="rounded-md border border-[#ffd166]/30 px-3 py-2 text-right text-sm text-[#ffd166]">
          <p>Total</p>
          <p className="font-semibold">{formatPrice(order.totalCents)}</p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-orange-200/10 rounded-md border border-orange-200/10 bg-[#100b0b]">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#ff6a1a] text-sm font-bold text-[#160b08]">
              {item.quantity}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{item.name}</p>
                <p className="shrink-0 text-sm text-zinc-400">
                  {formatPrice(item.lineTotalCents)}
                </p>
              </div>
              {item.category ? (
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  {item.category}
                </p>
              ) : null}
              {item.removedIngredientIds.length > 0 && item.menuItem ? (
                <p className="mt-2 rounded border border-orange-500/30 bg-orange-950/30 px-2 py-1 text-sm text-orange-100">
                  No{" "}
                  {getRemovedIngredientNames({
                    ingredients: item.menuItem.ingredients,
                    removedIngredientIds: item.removedIngredientIds,
                  })}
                </p>
              ) : null}
              {item.note ? (
                <p className="mt-2 rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1 text-sm text-amber-100">
                  Note: {item.note}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <form action={markOrderReadyAction} className="mt-5">
        <input type="hidden" name="orderId" value={order.id} />
        <button className="w-full rounded-md bg-[#ffd166] px-4 py-2 font-semibold text-[#160b08] hover:bg-[#ff6a1a]">
          Mark ready
        </button>
      </form>
    </article>
  );
}

function getTakeoutItemName(item: KitchenTakeoutSession["items"][number]) {
  return (
    item.menuItem.translations.find((translation) => translation.locale === "en")
      ?.name ?? `Menu item #${item.menuItemId}`
  );
}

function getTakeoutItemCategory(item: KitchenTakeoutSession["items"][number]) {
  return (
    item.menuItem.translations.find((translation) => translation.locale === "en")
      ?.category ??
    item.menuItem.categoryKey ??
    "Takeout"
  );
}

function getTakeoutTotalCents(takeoutSession: KitchenTakeoutSession) {
  return takeoutSession.items.reduce(
    (total, item) => total + item.menuItem.priceCents * item.quantity,
    0,
  );
}

function KitchenTakeoutCard({
  takeoutSession,
}: {
  takeoutSession: KitchenTakeoutSession;
}) {
  // Takeout cards are driven by TakeoutSession, not dine-in Order records.
  const submittedAt = takeoutSession.submittedAt ?? takeoutSession.createdAt;

  return (
    <article className="rounded-lg border border-orange-200/10 bg-[#1a0f0b] p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd166]">
            Takeout · {takeoutSession.status === "PAID" ? "Paid" : "Unpaid"}
          </p>
          <h3 className="mt-2 text-2xl font-bold">
            Pickup #{takeoutSession.id}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Submitted {formatTime(submittedAt)}
            {takeoutSession.guestName ? ` by ${takeoutSession.guestName}` : ""}
          </p>
        </div>
        <div className="rounded-md border border-[#ffd166]/30 px-3 py-2 text-right text-sm text-[#ffd166]">
          <p>Total</p>
          <p className="font-semibold">
            {formatPrice(getTakeoutTotalCents(takeoutSession))}
          </p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-orange-200/10 rounded-md border border-orange-200/10 bg-[#100b0b]">
        {takeoutSession.items.map((item) => (
          <li key={item.id} className="flex gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#ffd166] text-sm font-bold text-[#160b08]">
              {item.quantity}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{getTakeoutItemName(item)}</p>
                <p className="shrink-0 text-sm text-zinc-400">
                  {formatPrice(item.menuItem.priceCents * item.quantity)}
                </p>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                {getTakeoutItemCategory(item)}
              </p>
              {item.removedIngredientIds.length > 0 ? (
                <p className="mt-2 rounded border border-orange-500/30 bg-orange-950/30 px-2 py-1 text-sm text-orange-100">
                  No{" "}
                  {getRemovedIngredientNames({
                    ingredients: item.menuItem.ingredients,
                    removedIngredientIds: item.removedIngredientIds,
                  })}
                </p>
              ) : null}
              {item.note ? (
                <p className="mt-2 rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1 text-sm text-amber-100">
                  Note: {item.note}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <form action={markTakeoutReadyAction} className="mt-5">
        <input
          type="hidden"
          name="takeoutSessionId"
          value={takeoutSession.id}
        />
        <button className="w-full rounded-md bg-[#ffd166] px-4 py-2 font-semibold text-[#160b08] hover:bg-[#ff6a1a]">
          Mark ready
        </button>
      </form>
    </article>
  );
}
