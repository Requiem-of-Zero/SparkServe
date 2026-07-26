import { describe, expect, it } from "vitest";

import { CheckoutStatus, OrderStatus } from "./generated/prisma/enums";
import { getTableFloorStatus } from "./table-floor";

describe("getTableFloorStatus", () => {
  it("marks tables without an open session as available", () => {
    expect(
      getTableFloorStatus({
        hasOpenSession: false,
        openCartQuantity: 0,
        orderStatuses: [OrderStatus.SENT_TO_KITCHEN],
        checkoutStatuses: [CheckoutStatus.PENDING],
      }),
    ).toBe("AVAILABLE");
  });

  it("prioritizes pending checkout over kitchen and cart state", () => {
    expect(
      getTableFloorStatus({
        hasOpenSession: true,
        openCartQuantity: 2,
        orderStatuses: [OrderStatus.SENT_TO_KITCHEN],
        checkoutStatuses: [CheckoutStatus.PENDING],
      }),
    ).toBe("WAITING_FOR_PAYMENT");
  });

  it("shows ready when a kitchen order is ready for checkout", () => {
    expect(
      getTableFloorStatus({
        hasOpenSession: true,
        openCartQuantity: 0,
        orderStatuses: [OrderStatus.READY_FOR_CHECKOUT],
        checkoutStatuses: [],
      }),
    ).toBe("READY");
  });

  it("shows in kitchen while submitted orders are being prepared", () => {
    expect(
      getTableFloorStatus({
        hasOpenSession: true,
        openCartQuantity: 0,
        orderStatuses: [OrderStatus.SENT_TO_KITCHEN],
        checkoutStatuses: [],
      }),
    ).toBe("IN_KITCHEN");
  });

  it("shows ordering when guests have an open cart but no kitchen order", () => {
    expect(
      getTableFloorStatus({
        hasOpenSession: true,
        openCartQuantity: 3,
        orderStatuses: [],
        checkoutStatuses: [],
      }),
    ).toBe("ORDERING");
  });

  it("shows occupied when a session is open but no order activity has started", () => {
    expect(
      getTableFloorStatus({
        hasOpenSession: true,
        openCartQuantity: 0,
        orderStatuses: [],
        checkoutStatuses: [],
      }),
    ).toBe("OCCUPIED");
  });
});
