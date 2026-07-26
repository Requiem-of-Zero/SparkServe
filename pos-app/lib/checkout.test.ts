import { describe, expect, it } from "vitest";
import {
  calculateCheckoutTotals,
  calculateOrderTotals,
  calculatePlatformFeeCents,
  calculateTaxCents,
} from "./checkout";

describe("checkout money helpers", () => {
  it("calculates tax from a decimal rate", () => {
    expect(calculateTaxCents(2000, 0.095)).toBe(190);
  });

  it("calculates an order from submitted cart lines", () => {
    expect(
      calculateOrderTotals({
        lines: [
          { quantity: 2, unitPriceCents: 1399 },
          { quantity: 1, unitPriceCents: 499 },
        ],
        taxRate: 0.1,
      }),
    ).toEqual({
      subtotalCents: 3297,
      taxCents: 330,
      tipCents: 0,
      totalCents: 3627,
    });
  });

  it("calculates platform fee in basis points", () => {
    expect(calculatePlatformFeeCents({ totalCents: 2500, basisPoints: 100 })).toBe(
      25,
    );
  });

  it("combines multiple kitchen orders into one checkout receipt", () => {
    expect(
      calculateCheckoutTotals({
        platformFeeBasisPoints: 150,
        orders: [
          { subtotalCents: 2000, taxCents: 190, tipCents: 0, totalCents: 2190 },
          { subtotalCents: 1000, taxCents: 95, tipCents: 300, totalCents: 1395 },
        ],
      }),
    ).toEqual({
      subtotalCents: 3000,
      taxCents: 285,
      tipCents: 300,
      totalCents: 3585,
      platformFeeCents: 54,
    });
  });
});
