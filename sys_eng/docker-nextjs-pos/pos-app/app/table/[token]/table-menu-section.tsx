"use client";

import { useMemo, useState } from "react";

import { AddMenuItemButton } from "./add-menu-item-button";

type TableMenuItem = {
  id: number;
  priceCents: number;
  categoryKey: string | null;
  imageUrl: string | null;
  name: string;
  description: string | null;
  category: string;
};

// Customer-facing menu for one table session. Filtering is local; adding items
// goes through the realtime cart button so all guests stay in sync.
export function TableMenuSection({
  token,
  menuItems,
}: {
  token: string;
  menuItems: TableMenuItem[];
}) {
  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();

    for (const item of menuItems) {
      categoryMap.set(item.categoryKey ?? "menu", item.category);
    }

    return Array.from(categoryMap, ([key, label]) => ({ key, label }));
  }, [menuItems]);
  const [activeCategory, setActiveCategory] = useState("all");
  const visibleItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((item) => (item.categoryKey ?? "menu") === activeCategory);

  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Menu</h2>
          <p className="text-xs text-zinc-500">{visibleItems.length} items</p>
        </div>

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold ${
              activeCategory === "all"
                ? "bg-emerald-500 text-zinc-950"
                : "border border-zinc-700 text-zinc-600 hover:bg-zinc-800 dark:text-zinc-200"
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
                  ? "bg-emerald-500 text-zinc-950"
                  : "border border-zinc-700 text-zinc-600 hover:bg-zinc-800 dark:text-zinc-200"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 bg-zinc-950 p-3 sm:grid-cols-[112px_minmax(0,1fr)]"
          >
            <div className="h-24 overflow-hidden rounded-md bg-zinc-900 sm:h-28">
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

                <p className="shrink-0 text-sm font-semibold">
                  ${(item.priceCents / 100).toFixed(2)}
                </p>
              </div>

              <div className="mt-3 flex justify-end">
                <AddMenuItemButton token={token} menuItemId={item.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
