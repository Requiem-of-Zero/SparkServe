"use client";

import { useMemo, useState } from "react";

import { MenuItemDetailModal } from "@/app/components/menu-item-detail-modal";
import {
  formatMenuPrice,
  type CustomerMenuItem,
  type MenuItemCustomization,
} from "@/lib/menu-display";
import {
  calculateTakeoutSubtotalCents,
  type TakeoutCartLine,
} from "@/lib/takeout-session";

type CheckoutResponse = {
  message?: string;
  url?: string;
};

function createLineId({
  menuItemId,
  note,
  removedIngredientIds,
}: {
  menuItemId: number;
  note: string;
  removedIngredientIds: number[];
}) {
  return [
    menuItemId,
    note.trim().toLowerCase(),
    [...removedIngredientIds].sort((a, b) => a - b).join("."),
  ].join(":");
}

// Customer takeout cart. This is intentionally not tied to table-session
// sockets because takeout is a private cart for one customer.
export function TakeoutOrderClient({
  menuItems,
}: {
  menuItems: CustomerMenuItem[];
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartLines, setCartLines] = useState<TakeoutCartLine[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
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

  function addItem(item: CustomerMenuItem, customization: MenuItemCustomization) {
    const removedIngredientNames = item.ingredients
      .filter((ingredient) =>
        customization.removedIngredientIds.includes(ingredient.id),
      )
      .map((ingredient) => ingredient.name);
    const lineId = createLineId({
      menuItemId: item.id,
      note: customization.note,
      removedIngredientIds: customization.removedIngredientIds,
    });

    setCartLines((currentLines) => {
      const existingLine = currentLines.find((line) => line.id === lineId);

      if (existingLine) {
        return currentLines.map((line) =>
          line.id === lineId
            ? {
                ...line,
                quantity: Math.min(line.quantity + customization.quantity, 20),
              }
            : line,
        );
      }

      return [
        ...currentLines,
        {
          id: lineId,
          menuItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: customization.quantity,
          note: customization.note,
          removedIngredientIds: customization.removedIngredientIds,
          removedIngredientNames,
        },
      ];
    });
  }

  function changeQuantity(lineId: string, nextQuantity: number) {
    setCartLines((currentLines) =>
      currentLines.flatMap((line) => {
        if (line.id !== lineId) {
          return [line];
        }

        if (nextQuantity <= 0) {
          return [];
        }

        return [{ ...line, quantity: Math.min(nextQuantity, 20) }];
      }),
    );
  }

  async function startCheckout() {
    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const response = await fetch("/api/takeout/checkout/stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartLines.map((line) => ({
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            note: line.note,
            removedIngredientIds: line.removedIngredientIds,
          })),
        }),
      });
      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || !data.url) {
        throw new Error(data.message ?? "Could not start takeout checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Could not start takeout checkout.",
      );
    } finally {
      setIsCheckingOut(false);
    }
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
                    {formatMenuPrice(item.priceCents)}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  {item.ingredients.some(
                    (ingredient) => ingredient.commonAllergen,
                  ) ? (
                    <span className="mr-auto rounded-full border border-amber-500/40 px-2 py-1 text-xs text-amber-200">
                      Allergy info
                    </span>
                  ) : item.spicy ? (
                    <span className="mr-auto rounded-full border border-orange-500/40 px-2 py-1 text-xs text-orange-200">
                      Spice options
                    </span>
                  ) : item.ingredients.some(
                      (ingredient) =>
                        ingredient.commonAllergen && ingredient.removable,
                    ) ? (
                    <span className="mr-auto rounded-full border border-emerald-500/30 px-2 py-1 text-xs text-emerald-200">
                      Customizable
                    </span>
                  ) : null}
                  <MenuItemDetailModal
                    item={item}
                    addLabel="Add to takeout cart"
                    onAdd={(customization) => addItem(item, customization)}
                  >
                    <span className="inline-flex h-9 items-center rounded-md bg-[#ff6a1a] px-3 text-sm font-semibold text-[#160b08] hover:bg-[#ffd166]">
                      Customize
                    </span>
                  </MenuItemDetailModal>
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
                key={line.id}
                className="rounded-md border border-orange-950/60 bg-[#100b0b] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{line.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatMenuPrice(line.priceCents)} each
                    </p>
                    {line.removedIngredientNames.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-200">
                        No {line.removedIngredientNames.join(", ")}
                      </p>
                    ) : null}
                    {line.note ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Note: {line.note}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-semibold text-[#ffd166]">
                    {formatMenuPrice(line.priceCents * line.quantity)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      changeQuantity(line.id, line.quantity - 1)
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
                      changeQuantity(line.id, line.quantity + 1)
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
            <span>{formatMenuPrice(subtotalCents)}</span>
          </div>
          <button
            type="button"
            onClick={startCheckout}
            disabled={cartLines.length === 0 || isCheckingOut}
            className="mt-4 w-full rounded-md bg-[#ff6a1a] px-4 py-3 font-semibold text-[#160b08] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCheckingOut ? "Opening checkout..." : "Continue to checkout"}
          </button>
          {checkoutError ? (
            <p className="mt-3 text-xs text-red-300">{checkoutError}</p>
          ) : null}
          <p className="mt-3 text-xs text-zinc-500">
            Takeout checkout is private to this cart and separate from table QR
            sessions.
          </p>
        </div>
      </aside>
    </div>
  );
}
