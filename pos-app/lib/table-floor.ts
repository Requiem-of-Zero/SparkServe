import { CheckoutStatus, OrderStatus } from "./generated/prisma/enums";

export type TableFloorStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "ORDERING"
  | "IN_KITCHEN"
  | "READY"
  | "WAITING_FOR_PAYMENT";

export type TableFloorStatusInput = {
  hasOpenSession: boolean;
  openCartQuantity: number;
  orderStatuses: OrderStatus[];
  checkoutStatuses: CheckoutStatus[];
};

const kitchenActiveStatuses = new Set<OrderStatus>([
  OrderStatus.PENDING_OWNER_APPROVAL,
  OrderStatus.APPROVED,
  OrderStatus.SENT_TO_KITCHEN,
]);

// Collapses cart, order, and checkout state into one staff-friendly table badge.
export function getTableFloorStatus({
  checkoutStatuses,
  hasOpenSession,
  openCartQuantity,
  orderStatuses,
}: TableFloorStatusInput): TableFloorStatus {
  if (!hasOpenSession) {
    return "AVAILABLE";
  }

  if (checkoutStatuses.includes(CheckoutStatus.PENDING)) {
    return "WAITING_FOR_PAYMENT";
  }

  if (orderStatuses.includes(OrderStatus.READY_FOR_CHECKOUT)) {
    return "READY";
  }

  if (orderStatuses.some((status) => kitchenActiveStatuses.has(status))) {
    return "IN_KITCHEN";
  }

  if (openCartQuantity > 0) {
    return "ORDERING";
  }

  return "OCCUPIED";
}

export function getTableFloorStatusLabel(status: TableFloorStatus) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
