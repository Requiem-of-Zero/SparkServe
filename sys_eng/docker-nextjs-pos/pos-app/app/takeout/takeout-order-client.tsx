"use client";

import { useMemo, useState } from "react";

import {
  calculateTakeoutSubtotalCents,
  type TakeoutCartLine,
} from "@/lib/takeout-session";

type TakeoutMenuItem = {
  id: number;
  priceCents: number;
  categoryKey: string | null;
  imageUrl: string | null;
  name: string;
  description: string | null;
  category: string;
};

function formatPrice(priceCents: number) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

// Customer takeout cart. This is intentionally not tied to table-session
// sockets because takeout is a private cart for one customer.
export function TakeoutOrderClient({
  menuItems,
}: {
  menuItems: TakeoutMenuItem[];
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartLines, setCartLines] = useState<TakeoutCartLine[]>([]);
  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();

    for (const item of menuItems) {
      categoryMap.set(item.categoryKey ?? "menu", item.category);
    }

    return Array.from(categoryMap, ([key, label]) => ({ key, label }));
  }, [menuItems]);
  const visibleItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((item) => (item.categoryKey ?? "menu") === activeCategory);
  const subtotalCents = calculateTakeoutSubtotalCents(cartLines);

  function addItem(item: TakeoutMenuItem) {
    setCartLines((currentLines) => {
      const existingLine = currentLines.find((line) => line.menuItemId === item.id);

      if (existingLine) {
        return currentLines.map((line) =>
          line.menuItemId === item.id
            ? { ...line, quantity: Math.min(line.quantity + 1, 20) }
            : line,
        );
      }

      return [
        ...currentLines,
        {
          menuItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: 1,
        },
      ];
    });
  }

  function changeQuantity(menuItemId: number, nextQuantity: number) {
    setCartLines((currentLines) =>
      currentLines.flatMap((line) => {
        if (line.menuItemId !== menuItemId) {
          return [line];
        }

        if (nextQuantity <= 0) {
          return [];
        }

        return [{ ...line, quantity: Math.min(nextQuantity, 20) }];
      }),
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section>
        <div className="sticky top-0 z-10 border-b border-orange-950/60 bg-[#100b0b]/95 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Takeout menu</h2>
            <p className="text-xs text-zinc-500">{visibleItems.length} items</p>
          </div>

          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold ${
                activeCategory === "all"
                  ? "bg-[#ff6a1a] text-[#160b08]"
                  : "border border-orange-200/25 text-zinc-200 hover:bg-orange-100/10"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategory(category.key)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold ${
                  activeCategory === category.key
                    ? "bg-[#ff6a1a] text-[#160b08]"
                    : "border border-orange-200/25 text-zinc-200 hover:bg-orange-100/10"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 divide-y divide-orange-950/50 overflow-hidden rounded-lg border border-orange-950/60 bg-[#1a0f0b]">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)]"
            >
              <div className="h-24 overflow-hidden rounded-md bg-[#100b0b] sm:h-28">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-semibold leading-snug">
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-400">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-zinc-500">{item.category}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[#ffd166]">
                    {formatPrice(item.priceCents)}
                  </p>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => addItem(item)}
                    className="h-9 rounded-md bg-[#ff6a1a] px-3 text-sm font-semibold text-[#160b08] hover:bg-[#ffd166]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-orange-950/60 bg-[#1a0f0b] p-4 lg:sticky lg:top-5">
        <h2 className="text-lg font-semibold">Your takeout cart</h2>
        <div className="mt-4 space-y-3">
          {cartLines.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Add menu items to start a takeout order.
            </p>
          ) : (
            cartLines.map((line) => (
              <div
                key={line.menuItemId}
                className="rounded-md border border-orange-950/60 bg-[#100b0b] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{line.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatPrice(line.priceCents)} each
                    </p>
                  </div>
                  <p className="font-semibold text-[#ffd166]">
                    {formatPrice(line.priceCents * line.quantity)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      changeQuantity(line.menuItemId, line.quantity - 1)
                    }
                    className="h-8 w-8 rounded-md border border-orange-200/25 text-sm"
                    aria-label={`Remove one ${line.name}`}
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      changeQuantity(line.menuItemId, line.quantity + 1)
                    }
                    className="h-8 w-8 rounded-md border border-orange-200/25 text-sm"
                    aria-label={`Add one ${line.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 border-t border-orange-950/60 pt-4">
          <div className="flex items-center justify-between font-semibold">
            <span>Subtotal</span>
            <span>{formatPrice(subtotalCents)}</span>
          </div>
          <button
            type="button"
            disabled={cartLines.length === 0}
            className="mt-4 w-full rounded-md bg-[#ff6a1a] px-4 py-3 font-semibold text-[#160b08] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to checkout
          </button>
          <p className="mt-3 text-xs text-zinc-500">
            Checkout will persist this as a takeout session next, separate from
            table QR sessions.
          </p>
        </div>
      </aside>
    </div>
  );
}
