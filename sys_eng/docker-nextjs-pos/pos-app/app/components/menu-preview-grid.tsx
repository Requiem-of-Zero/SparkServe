"use client";

import { MenuItemDetailModal } from "@/app/components/menu-item-detail-modal";
import {
  formatMenuPrice,
  type CustomerMenuItem,
} from "@/lib/menu-display";

// Read-only customer menu preview used before a cart flow starts.
export function MenuPreviewGrid({ menuItems }: { menuItems: CustomerMenuItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {menuItems.map((item) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-lg border border-orange-950/60 bg-[#1a0f0b]"
        >
          <MenuItemDetailModal item={item}>
            <span className="block">
              <span className="block h-44 w-full overflow-hidden bg-[#100b0b]">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                    No photo
                  </span>
                )}
              </span>
              <span className="block p-4">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{item.name}</span>
                  <span className="shrink-0 font-semibold text-[#ffd166]">
                    {formatMenuPrice(item.priceCents)}
                  </span>
                </span>
                {item.description ? (
                  <span className="mt-2 block text-sm text-zinc-400">
                    {item.description}
                  </span>
                ) : null}
                <span className="mt-3 block text-xs uppercase tracking-wide text-zinc-500">
                  {item.category}
                </span>
                {item.ingredients.some(
                  (ingredient) => ingredient.commonAllergen,
                ) ? (
                  <span className="mt-3 inline-flex rounded-full border border-amber-500/40 px-2 py-1 text-xs text-amber-200">
                    Allergy info
                  </span>
                ) : item.spicy ? (
                  <span className="mt-3 inline-flex rounded-full border border-orange-500/40 px-2 py-1 text-xs text-orange-200">
                    Spice options
                  </span>
                ) : item.ingredients.some(
                    (ingredient) =>
                      ingredient.commonAllergen && ingredient.removable,
                  ) ? (
                  <span className="mt-3 inline-flex rounded-full border border-emerald-500/30 px-2 py-1 text-xs text-emerald-200">
                    Customizable
                  </span>
                ) : null}
              </span>
            </span>
          </MenuItemDetailModal>
        </article>
      ))}
    </div>
  );
}
