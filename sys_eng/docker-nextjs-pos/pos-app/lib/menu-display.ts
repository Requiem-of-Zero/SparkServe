export type CustomerMenuIngredient = {
  id: number;
  name: string;
  commonAllergen: boolean;
  allergenNote: string | null;
  removable: boolean;
};

export type CustomerMenuItem = {
  id: number;
  priceCents: number;
  categoryKey: string | null;
  imageUrl: string | null;
  spicy: boolean;
  name: string;
  description: string | null;
  category: string;
  ingredients: CustomerMenuIngredient[];
};

export type MenuItemCustomization = {
  quantity: number;
  note: string;
  removedIngredientIds: number[];
};

export function formatMenuPrice(priceCents: number) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function formatRemovedIngredientNames(ingredientNames: string[]) {
  const cleanNames = ingredientNames
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 20);

  return cleanNames.length > 0 ? cleanNames.join(", ") : null;
}
