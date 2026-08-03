import type { CustomerMenuItem } from "@/lib/menu-display";

export function getMenuItemBadgeState(item: CustomerMenuItem) {
  const hasAllergens = item.ingredients.some(
    (ingredient) => ingredient.commonAllergen,
  );
  const hasRemovableAllergens = item.ingredients.some(
    (ingredient) => ingredient.commonAllergen && ingredient.removable,
  );

  return {
    hasAllergens,
    hasCustomizations: hasRemovableAllergens || item.spicy,
    hasSpiceOptions: item.spicy,
  };
}

// Small menu-card indicators show allergy/customization affordances before the
// customer opens the full item detail modal.
export function MenuItemBadges({ item }: { item: CustomerMenuItem }) {
  const { hasAllergens, hasCustomizations, hasSpiceOptions } =
    getMenuItemBadgeState(item);

  if (!hasAllergens && !hasCustomizations && !hasSpiceOptions) {
    return null;
  }

  return (
    <span className="mt-3 flex flex-wrap gap-2">
      {hasAllergens ? (
        <span className="inline-flex rounded-full border border-amber-500/40 px-2 py-1 text-xs text-amber-200">
          Allergy info
        </span>
      ) : null}
      {hasSpiceOptions ? (
        <span className="inline-flex rounded-full border border-orange-500/40 px-2 py-1 text-xs text-orange-200">
          Spice options
        </span>
      ) : null}
      {hasCustomizations ? (
        <span className="inline-flex rounded-full border border-emerald-500/30 px-2 py-1 text-xs text-emerald-200">
          Customizable
        </span>
      ) : null}
    </span>
  );
}
