export const allowedSpiceNotes = new Set([
  "Spice: Mild",
  "Spice: Medium",
  "Spice: Hot",
]);

export function sanitizeMenuQuantity(value: unknown, maxQuantity = 20) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
    throw new Error(`Quantity must be between 1 and ${maxQuantity}.`);
  }

  return quantity;
}

export function sanitizeKitchenNote(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 160)
    : null;
}

export function sanitizeIngredientIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ).slice(0, 20)
    : [];
}

export function resolveAllowedSpiceNote({
  note,
  spicy,
}: {
  note: string | null;
  spicy: boolean;
}) {
  return spicy && note && allowedSpiceNotes.has(note) ? note : null;
}

export function resolveRemovableIngredientCustomizations<
  TIngredient extends {
    ingredientId: number;
    removable: boolean;
    ingredient: {
      commonAllergen: boolean;
      name: string;
    };
  },
>({
  ingredientIds,
  menuItemIngredients,
}: {
  ingredientIds: number[];
  menuItemIngredients: TIngredient[];
}) {
  const removableEntries = menuItemIngredients.filter(
    (entry) =>
      entry.removable &&
      entry.ingredient.commonAllergen &&
      ingredientIds.includes(entry.ingredientId),
  );

  return {
    removedIngredientIds: removableEntries.map((entry) => entry.ingredientId),
    removedIngredientNames: removableEntries.map((entry) => entry.ingredient.name),
  };
}
