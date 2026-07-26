"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit-log";
import { requireActiveEmployee } from "@/lib/employee-auth";
import { OrderStatus, TakeoutSessionStatus } from "@/lib/generated/prisma/enums";
import { notifyKitchenQueueChanged } from "@/lib/kitchen-realtime";
import { prisma } from "@/lib/prisma";

// Kitchen staff move submitted orders forward once the food is ready.
// Later, this can broadcast a realtime status update to the table/takeout app.
export async function markOrderReadyAction(formData: FormData) {
  const employee = await requireActiveEmployee();
  const orderId = Number(formData.get("orderId"));

  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new Error("A valid order id is required.");
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.READY_FOR_CHECKOUT },
    select: {
      id: true,
      tableSessionId: true,
    },
  });

  await writeAuditEvent({
    action: "KITCHEN_ORDER_READY",
    employeeProfileId: employee.id,
    entityType: "Order",
    entityId: order.id,
    metadata: {
      tableSessionId: order.tableSessionId,
    },
  });

  revalidatePath("/staff/kitchen");
  await notifyKitchenQueueChanged("dine-in-ready");
}

// Takeout sessions use their own model, so kitchen readiness updates that queue
// separately from dine-in Order records.
export async function markTakeoutReadyAction(formData: FormData) {
  const employee = await requireActiveEmployee();
  const takeoutSessionId = Number(formData.get("takeoutSessionId"));

  if (!Number.isInteger(takeoutSessionId) || takeoutSessionId <= 0) {
    throw new Error("A valid takeout session id is required.");
  }

  const takeoutSession = await prisma.takeoutSession.update({
    where: { id: takeoutSessionId },
    data: { status: TakeoutSessionStatus.READY },
    select: { id: true },
  });

  await writeAuditEvent({
    action: "KITCHEN_TAKEOUT_READY",
    employeeProfileId: employee.id,
    entityType: "TakeoutSession",
    entityId: takeoutSession.id,
  });

  revalidatePath("/staff/kitchen");
  await notifyKitchenQueueChanged("takeout-ready");
}
