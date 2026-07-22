export type TakeoutCartLine = {
  id: string;
  menuItemId: number;
  name: string;
  priceCents: number;
  quantity: number;
  note: string;
  removedIngredientIds: number[];
  removedIngredientNames: string[];
};

// Takeout is intentionally separate from table sessions: one customer, one cart,
// no shared table owner approval flow. The DB models are in prisma/schema/takeout.prisma.
export function calculateTakeoutSubtotalCents(lines: TakeoutCartLine[]) {
  return lines.reduce(
    (total, line) => total + line.priceCents * line.quantity,
    0,
  );
}
