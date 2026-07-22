"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  formatMenuPrice,
  type CustomerMenuItem,
  type MenuItemCustomization,
} from "@/lib/menu-display";

type MenuItemDetailModalProps = {
  item: CustomerMenuItem;
  addLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
  onAdd?: (customization: MenuItemCustomization) => void | Promise<void>;
};

function AllergyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function clampQuantity(quantity: number) {
  return Math.min(20, Math.max(1, quantity));
}

const spiceLevels = ["Mild", "Medium", "Hot"] as const;

// Reusable customer item detail modal for menu inspection and cart customization.
export function MenuItemDetailModal({
  addLabel = "Add to cart",
  children,
  disabled,
  disabledMessage,
  item,
  onAdd,
}: MenuItemDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [spiceLevel, setSpiceLevel] = useState<(typeof spiceLevels)[number]>(
    "Medium",
  );
  const [removedIngredientIds, setRemovedIngredientIds] = useState<number[]>([]);
  const allergyIngredients = useMemo(
    () => item.ingredients.filter((ingredient) => ingredient.commonAllergen),
    [item.ingredients],
  );
  const hasCustomizations = item.ingredients.some(
    (ingredient) => ingredient.commonAllergen && ingredient.removable,
  ) || item.spicy;

  function toggleRemovedIngredient(ingredientId: number) {
    setRemovedIngredientIds((currentIds) =>
      currentIds.includes(ingredientId)
        ? currentIds.filter((id) => id !== ingredientId)
        : [...currentIds, ingredientId],
    );
  }

  async function handleAdd() {
    if (!onAdd || disabled) {
      return;
    }

    setIsAdding(true);

    try {
      await onAdd({
        quantity,
        note: item.spicy ? `Spice: ${spiceLevel}` : "",
        removedIngredientIds,
      });
      setIsOpen(false);
      setQuantity(1);
      setSpiceLevel("Medium");
      setRemovedIngredientIds([]);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="text-left">
        {children}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 py-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg animate-[modal-pop_180ms_ease-out] overflow-y-auto rounded-xl border border-orange-200/20 bg-[#160d0a] text-[#fff7ed] shadow-2xl shadow-black/40">
            <div className="relative">
              <div className="h-56 bg-[#100b0b]">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    No photo
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80"
                aria-label="Close item details"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd166]">
                      {item.category}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{item.name}</h2>
                  </div>
                  <p className="shrink-0 font-semibold text-[#ffd166]">
                    {formatMenuPrice(item.priceCents)}
                  </p>
                </div>
                {item.description ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {item.description}
                  </p>
                ) : null}
              </div>

              {allergyIngredients.length > 0 ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/35 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                    <AllergyIcon />
                    Allergy information
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allergyIngredients.map((ingredient) => (
                      <span
                        key={ingredient.id}
                        className="rounded-full border border-amber-400/40 px-2 py-1 text-xs text-amber-100"
                        title={ingredient.allergenNote ?? undefined}
                      >
                        {ingredient.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {item.ingredients.length > 0 ? (
                <div>
                  <h3 className="font-semibold">Ingredients</h3>
                  <div className="mt-3 space-y-2">
                    {item.ingredients.map((ingredient) => (
                      <label
                        key={ingredient.id}
                        className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                          ingredient.commonAllergen
                            ? "border-amber-500/40 bg-amber-950/20"
                            : "border-orange-200/10 bg-[#100b0b]"
                        }`}
                      >
                        <span>
                          <span className="font-medium">{ingredient.name}</span>
                          {ingredient.allergenNote ? (
                            <span className="mt-1 block text-xs text-zinc-400">
                              {ingredient.allergenNote}
                            </span>
                          ) : null}
                        </span>
                        {onAdd &&
                        ingredient.commonAllergen &&
                        ingredient.removable ? (
                          <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-300">
                            Remove for allergy
                            <input
                              type="checkbox"
                              checked={removedIngredientIds.includes(
                                ingredient.id,
                              )}
                              onChange={() =>
                                toggleRemovedIngredient(ingredient.id)
                              }
                              className="h-4 w-4 accent-[#ff6a1a]"
                            />
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {onAdd ? (
                <>
                  {item.spicy ? (
                    <div>
                      <p className="text-sm font-medium text-zinc-300">
                        Spice level
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {spiceLevels.map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setSpiceLevel(level)}
                            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                              spiceLevel === level
                                ? "border-[#ffd166] bg-[#ffd166] text-[#160b08]"
                                : "border-orange-200/20 bg-[#100b0b] text-zinc-200 hover:bg-orange-100/10"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 items-center rounded-md border border-orange-200/25">
                      <button
                        type="button"
                        onClick={() => setQuantity(clampQuantity(quantity - 1))}
                        className="h-10 w-10 text-sm font-semibold hover:bg-orange-100/10"
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(clampQuantity(quantity + 1))}
                        className="h-10 w-10 text-sm font-semibold hover:bg-orange-100/10"
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={isAdding || disabled}
                      className="min-h-10 flex-1 rounded-md bg-[#ff6a1a] px-4 py-2 font-semibold text-[#160b08] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAdding ? "Adding..." : addLabel}
                    </button>
                  </div>
                  {disabled && disabledMessage ? (
                    <p className="text-xs text-amber-200">{disabledMessage}</p>
                  ) : null}
                </>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-md bg-[#ff6a1a] px-4 py-2 font-semibold text-[#160b08] hover:bg-[#ffd166]"
                  >
                    Close
                  </button>
                </div>
              )}

              {hasCustomizations ? (
                <p className="text-xs text-zinc-500">
                  Allergy removals and spice levels are prepared as kitchen
                  instructions.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
