export type CheckoutLine = {
  quantity: number;
  unitPriceCents: number;
};

export type CheckoutOrderTotals = {
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
};

export type CheckoutTotals = CheckoutOrderTotals & {
  platformFeeCents: number;
};

function assertWholeCents(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole-cent value.`);
  }
}

// Converts a decimal tax rate like 0.095 into cents using normal rounding.
export function calculateTaxCents(subtotalCents: number, taxRate: number) {
  assertWholeCents(subtotalCents, "subtotalCents");

  if (!Number.isFinite(taxRate) || taxRate < 0) {
    throw new Error("taxRate must be a non-negative number.");
  }

  return Math.round(subtotalCents * taxRate);
}

// Order totals are calculated from immutable menu snapshots at submit time.
export function calculateOrderTotals({
  lines,
  taxRate = 0,
  tipCents = 0,
}: {
  lines: CheckoutLine[];
  taxRate?: number;
  tipCents?: number;
}): CheckoutOrderTotals {
  assertWholeCents(tipCents, "tipCents");

  const subtotalCents = lines.reduce((sum, line) => {
    assertWholeCents(line.quantity, "quantity");
    assertWholeCents(line.unitPriceCents, "unitPriceCents");

    if (line.quantity < 1) {
      throw new Error("quantity must be at least 1.");
    }

    return sum + line.quantity * line.unitPriceCents;
  }, 0);
  const taxCents = calculateTaxCents(subtotalCents, taxRate);

  return {
    subtotalCents,
    taxCents,
    tipCents,
    totalCents: subtotalCents + taxCents + tipCents,
  };
}

// Platform fee is stored in basis points: 100 = 1.00%, 50 = 0.50%.
export function calculatePlatformFeeCents({
  totalCents,
  basisPoints,
}: {
  totalCents: number;
  basisPoints: number;
}) {
  assertWholeCents(totalCents, "totalCents");

  if (!Number.isInteger(basisPoints) || basisPoints < 0) {
    throw new Error("basisPoints must be a non-negative integer.");
  }

  return Math.round((totalCents * basisPoints) / 10_000);
}

// Final checkout totals combine every unpaid kitchen order for the table.
export function calculateCheckoutTotals({
  orders,
  platformFeeBasisPoints = 0,
}: {
  orders: CheckoutOrderTotals[];
  platformFeeBasisPoints?: number;
}): CheckoutTotals {
  const subtotalCents = orders.reduce((sum, order) => {
    assertWholeCents(order.subtotalCents, "subtotalCents");
    return sum + order.subtotalCents;
  }, 0);
  const taxCents = orders.reduce((sum, order) => {
    assertWholeCents(order.taxCents, "taxCents");
    return sum + order.taxCents;
  }, 0);
  const tipCents = orders.reduce((sum, order) => {
    assertWholeCents(order.tipCents, "tipCents");
    return sum + order.tipCents;
  }, 0);
  const totalCents = orders.reduce((sum, order) => {
    assertWholeCents(order.totalCents, "totalCents");
    return sum + order.totalCents;
  }, 0);

  return {
    subtotalCents,
    taxCents,
    tipCents,
    totalCents,
    platformFeeCents: calculatePlatformFeeCents({
      totalCents,
      basisPoints: platformFeeBasisPoints,
    }),
  };
}
