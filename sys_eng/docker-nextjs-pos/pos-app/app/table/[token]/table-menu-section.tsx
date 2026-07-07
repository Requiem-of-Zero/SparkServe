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
    <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Menu</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              activeCategory === "all"
                ? "bg-emerald-500 text-zinc-950"
                : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                activeCategory === category.key
                  ? "bg-emerald-500 text-zinc-950"
                  : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="h-40 w-full object-cover"
              />
            ) : null}
            <div className="flex items-start justify-between gap-4 p-4">
              <div>
                <h3 className="font-semibold">{item.name}</h3>

                {item.description ? (
                  <p className="mt-1 text-sm text-zinc-400">
                    {item.description}
                  </p>
                ) : null}

                <p className="mt-2 text-sm text-zinc-500">{item.category}</p>
              </div>

              <div className="text-right">
                <p className="font-semibold">
                  ${(item.priceCents / 100).toFixed(2)}
                </p>

                <AddMenuItemButton token={token} menuItemId={item.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
