"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit-log";
import { calculateCheckoutTotals } from "@/lib/checkout";
import { requireActiveEmployee } from "@/lib/employee-auth";
import { notifyFloorChanged } from "@/lib/floor-realtime";
import { readPositiveInteger, readRequiredString } from "@/lib/form-data";
import {
  CheckoutStatus,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentTransactionType,
  TableSessionStatus,
  TableSessionTransferStatus,
} from "@/lib/generated/prisma/enums";
import {
  getApprovalEmployeeDisplayName,
  requireManagerApprovalCode,
} from "@/lib/manager-approval";
import { prisma } from "@/lib/prisma";
import { canManageFloorActions } from "@/lib/staff-floor-actions";
import { notifyTableSessionChanged } from "@/lib/table-session-realtime";

export type TransferTableSessionState = {
  message?: string;
  status: "idle" | "requested" | "approved" | "denied" | "error";
};

export type FloorSessionControlState = {
  message?: string;
  status: "idle" | "updated" | "cancelled" | "error";
};

export type StaffCheckoutState = {
  checkoutId?: number;
  message?: string;
  status: "idle" | "paid" | "error";
};

const staffCheckoutOrderStatuses = [
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.READY_FOR_CHECKOUT,
];

function readAttendeeCount(formData: FormData) {
  const attendeeCount = Number(formData.get("attendeeCount"));

  if (!Number.isInteger(attendeeCount) || attendeeCount < 1 || attendeeCount > 99) {
    throw new Error("Attendee count must be between 1 and 99.");
  }

  return attendeeCount;
}

function readStaffPaymentMethod(formData: FormData) {
  const method = readRequiredString(formData, "paymentMethod");

  switch (method) {
    case "card":
      return PaymentMethod.STAFF_TERMINAL_CARD;
    case "cash":
      return PaymentMethod.CASH;
    case "comp":
      return PaymentMethod.MANUAL_COMP;
    default:
      throw new Error("Choose a supported payment method.");
  }
}

async function requireManagerFloorAction() {
  const employee = await requireActiveEmployee();

  if (!canManageFloorActions(employee.role)) {
    throw new Error("Only managers and owners can change floor sessions.");
  }

  return employee;
}

async function getFloorActionApprover({
  employee,
  formData,
}: {
  employee: Awaited<ReturnType<typeof requireActiveEmployee>>;
  formData: FormData;
}) {
  if (canManageFloorActions(employee.role)) {
    return {
      approvedBy: employee.user.displayUsername || employee.user.name,
      approvedByEmployeeProfileId: employee.id,
      approvalMode: "active-session",
      approvalRole: employee.role,
    };
  }

  const approvingEmployee = await requireManagerApprovalCode(formData);

  return {
    approvedBy: getApprovalEmployeeDisplayName(approvingEmployee),
    approvedByEmployeeProfileId: approvingEmployee.id,
    approvalMode: "manager-code",
    approvalRole: approvingEmployee.role,
  };
}

function formatTableLabel(table: {
  col: number;
  label: string | null;
  row: string;
}) {
  return table.label ?? `${table.row}${table.col}`;
}

function hasCustomerSessionActivity(session: {
  _count: {
    checkouts: number;
    items: number;
    orders: number;
    participants: number;
  };
}) {
  return (
    session._count.participants > 0 ||
    session._count.items > 0 ||
    session._count.orders > 0 ||
    session._count.checkouts > 0
  );
}

async function getTransferDestination(destinationTableId: number) {
  const destinationTable = await prisma.diningTable.findUnique({
    where: { id: destinationTableId },
  });

  if (!destinationTable || !destinationTable.active) {
    throw new Error("Destination table is not available.");
  }

  const destinationOpenSession = await prisma.tableSession.findFirst({
    where: {
      tableId: destinationTable.id,
      status: TableSessionStatus.OPEN,
    },
    select: {
      id: true,
      publicToken: true,
      _count: {
        select: {
          checkouts: true,
          items: true,
          orders: true,
          participants: true,
        },
      },
    },
  });

  if (
    destinationOpenSession &&
    hasCustomerSessionActivity(destinationOpenSession)
  ) {
    throw new Error("Destination table already has an active customer session.");
  }

  return { destinationOpenSession, destinationTable };
}

export async function updateTableSessionAttendeeCountAction(
  _previousState: FloorSessionControlState,
  formData: FormData,
): Promise<FloorSessionControlState> {
  try {
    const employee = await requireManagerFloorAction();
    const approval = await getFloorActionApprover({ employee, formData });
    const tableSessionId = readPositiveInteger(formData, "tableSessionId");
    const attendeeCount = readAttendeeCount(formData);
    const session = await prisma.tableSession.findUnique({
      where: { id: tableSessionId },
      include: { table: true },
    });

    if (!session || session.status !== TableSessionStatus.OPEN) {
      throw new Error("Only open table sessions can be updated.");
    }

    const previousAttendeeCount = session.attendeeCount;

    await prisma.tableSession.update({
      where: { id: session.id },
      data: { attendeeCount },
    });

    await writeAuditEvent({
      action: "TABLE_SESSION_ATTENDEE_COUNT_UPDATED",
      employeeProfileId: employee.id,
      entityType: "TableSession",
      entityId: session.id,
      metadata: {
        publicToken: session.publicToken,
        tableId: session.tableId,
        tableLabel: formatTableLabel(session.table),
        previousAttendeeCount,
        attendeeCount,
        ...approval,
      },
    });

    revalidatePath("/staff/tables");
    revalidatePath(`/table/${session.publicToken}`);
    await notifyFloorChanged("attendees-updated");

    return {
      message: `Updated party size to ${attendeeCount}.`,
      status: "updated",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not update attendee count.",
      status: "error",
    };
  }
}

export async function cancelTableSessionAction(
  _previousState: FloorSessionControlState,
  formData: FormData,
): Promise<FloorSessionControlState> {
  try {
    const employee = await requireManagerFloorAction();
    const approval = await getFloorActionApprover({ employee, formData });
    const tableSessionId = readPositiveInteger(formData, "tableSessionId");
    const session = await prisma.tableSession.findUnique({
      where: { id: tableSessionId },
      include: {
        table: true,
        _count: {
          select: {
            checkouts: true,
            items: true,
            orders: true,
            participants: true,
          },
        },
      },
    });

    if (!session || session.status !== TableSessionStatus.OPEN) {
      throw new Error("Only open table sessions can be cancelled.");
    }

    await prisma.$transaction([
      prisma.tableSessionTransferRequest.updateMany({
        where: {
          tableSessionId: session.id,
          status: TableSessionTransferStatus.PENDING,
        },
        data: {
          reviewedByEmployeeId: employee.id,
          status: TableSessionTransferStatus.CANCELLED,
          respondedAt: new Date(),
        },
      }),
      prisma.tableSession.update({
        where: { id: session.id },
        data: {
          status: TableSessionStatus.CANCELLED,
          closedAt: new Date(),
        },
      }),
    ]);

    await writeAuditEvent({
      action: "TABLE_SESSION_CANCELLED",
      employeeProfileId: employee.id,
      entityType: "TableSession",
      entityId: session.id,
      metadata: {
        publicToken: session.publicToken,
        tableId: session.tableId,
        tableLabel: formatTableLabel(session.table),
        counts: session._count,
        ...approval,
      },
    });

    revalidatePath("/staff/tables");
    revalidatePath(`/table/${session.publicToken}`);
    await notifyFloorChanged("session-cancelled");

    return {
      message: `Cancelled session #${session.id}.`,
      status: "cancelled",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Could not cancel session.",
      status: "error",
    };
  }
}

// Staff-assisted closeout records the in-person payment and closes the dining visit.
export async function closeTableSessionWithPaymentAction(
  _previousState: StaffCheckoutState,
  formData: FormData,
): Promise<StaffCheckoutState> {
  try {
    const employee = await requireActiveEmployee();
    const tableSessionId = readPositiveInteger(formData, "tableSessionId");
    const paymentMethod = readStaffPaymentMethod(formData);
    const paidAt = new Date();
    const restaurantSettings = await prisma.restaurantSettings.findUnique({
      where: { id: 1 },
      select: { currency: true },
    });
    const session = await prisma.tableSession.findUnique({
      where: { id: tableSessionId },
      include: {
        orders: {
          where: {
            paidAt: null,
            cancelledAt: null,
            status: {
              in: staffCheckoutOrderStatuses,
            },
          },
          orderBy: { submittedAt: "asc" },
        },
        table: true,
      },
    });

    if (!session || session.status !== TableSessionStatus.OPEN) {
      throw new Error("Only open table sessions can be checked out.");
    }

    if (session.orders.length === 0) {
      throw new Error("No unpaid kitchen orders are ready for checkout.");
    }

    const totals = calculateCheckoutTotals({
      orders: session.orders.map((order) => ({
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        tipCents: order.tipCents,
        totalCents: order.totalCents,
      })),
      platformFeeBasisPoints: 0,
    });
    const orderIds = session.orders.map((order) => order.id);
    const checkout = await prisma.$transaction(async (tx) => {
      await tx.checkout.updateMany({
        where: {
          tableSessionId: session.id,
          status: CheckoutStatus.PENDING,
        },
        data: {
          status: CheckoutStatus.CANCELLED,
          cancelledAt: paidAt,
        },
      });

      const createdCheckout = await tx.checkout.create({
        data: {
          tableSessionId: session.id,
          status: CheckoutStatus.PAID,
          currency: restaurantSettings?.currency?.toLowerCase() ?? "usd",
          subtotalCents: totals.subtotalCents,
          taxCents: totals.taxCents,
          tipCents: totals.tipCents,
          totalCents: totals.totalCents,
          platformFeeCents: totals.platformFeeCents,
          paidAt,
          orders: {
            connect: orderIds.map((id) => ({ id })),
          },
        },
      });

      await tx.payment.create({
        data: {
          checkoutId: createdCheckout.id,
          status: PaymentStatus.PAID,
          method: paymentMethod,
          provider: PaymentProvider.NONE,
          transactionType: PaymentTransactionType.DINE_IN,
          amountCents: totals.totalCents,
          platformFeeCents: totals.platformFeeCents,
          paidAt,
        },
      });

      await tx.order.updateMany({
        where: {
          id: {
            in: orderIds,
          },
        },
        data: {
          checkedOutByEmployeeId: employee.id,
          paidAt,
          status: OrderStatus.PAID,
        },
      });

      await tx.tableSessionTransferRequest.updateMany({
        where: {
          tableSessionId: session.id,
          status: TableSessionTransferStatus.PENDING,
        },
        data: {
          reviewedByEmployeeId: employee.id,
          status: TableSessionTransferStatus.CANCELLED,
          respondedAt: paidAt,
        },
      });

      await tx.tableSession.update({
        where: { id: session.id },
        data: {
          closedAt: paidAt,
          status: TableSessionStatus.CHECKED_OUT,
        },
      });

      return createdCheckout;
    });

    await writeAuditEvent({
      action: "TABLE_SESSION_CHECKED_OUT",
      employeeProfileId: employee.id,
      entityType: "Checkout",
      entityId: checkout.id,
      metadata: {
        tableSessionId: session.id,
        publicToken: session.publicToken,
        tableId: session.tableId,
        tableLabel: formatTableLabel(session.table),
        orderIds,
        paymentMethod,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        tipCents: totals.tipCents,
        totalCents: totals.totalCents,
      },
    });

    revalidatePath("/staff/tables");
    revalidatePath(`/table/${session.publicToken}`);
    await notifyFloorChanged("session-checked-out");
    await notifyTableSessionChanged({
      message: "A waiter closed this table session. Thank you.",
      reason: "session-checked-out",
      token: session.publicToken,
    });

    return {
      checkoutId: checkout.id,
      message: `Closed ${formatTableLabel(session.table)} for $${(
        totals.totalCents / 100
      ).toFixed(2)}.`,
      status: "paid",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not close table session.",
      status: "error",
    };
  }
}

// Staff request the move; a manager/owner tablet must approve or deny it.
export async function requestTableSessionTransferAction(
  _previousState: TransferTableSessionState,
  formData: FormData,
): Promise<TransferTableSessionState> {
  try {
    const employee = await requireActiveEmployee();
    const tableSessionId = readPositiveInteger(formData, "tableSessionId");
    const destinationTableId = readPositiveInteger(
      formData,
      "destinationTableId",
    );
    const session = await prisma.tableSession.findUnique({
      where: { id: tableSessionId },
      include: { table: true },
    });

    if (!session || session.status !== TableSessionStatus.OPEN) {
      throw new Error("Only open table sessions can be transferred.");
    }

    if (session.tableId === destinationTableId) {
      throw new Error("Choose a different destination table.");
    }

    const { destinationOpenSession, destinationTable } =
      await getTransferDestination(destinationTableId);

    if (canManageFloorActions(employee.role)) {
      await prisma.$transaction([
        ...(destinationOpenSession
          ? [
              prisma.tableSession.update({
                where: { id: destinationOpenSession.id },
                data: {
                  status: TableSessionStatus.CANCELLED,
                  closedAt: new Date(),
                },
              }),
            ]
          : []),
        prisma.tableSessionTransferRequest.updateMany({
          where: {
            tableSessionId: session.id,
            status: TableSessionTransferStatus.PENDING,
          },
          data: {
            reviewedByEmployeeId: employee.id,
            status: TableSessionTransferStatus.CANCELLED,
            respondedAt: new Date(),
          },
        }),
        prisma.tableSession.update({
          where: { id: session.id },
          data: { tableId: destinationTable.id },
        }),
      ]);

      await writeAuditEvent({
        action: "TABLE_SESSION_TRANSFERRED",
        employeeProfileId: employee.id,
        entityType: "TableSession",
        entityId: session.id,
        metadata: {
          transferMode: "direct-manager",
          publicToken: session.publicToken,
          fromTableId: session.tableId,
          fromTableLabel: formatTableLabel(session.table),
          toTableId: destinationTable.id,
          toTableLabel: formatTableLabel(destinationTable),
          cancelledEmptyDestinationSessionId: destinationOpenSession?.id,
          cancelledEmptyDestinationToken: destinationOpenSession?.publicToken,
        },
      });

      revalidatePath("/staff/tables");
      revalidatePath(`/table/${session.publicToken}`);
      if (destinationOpenSession) {
        revalidatePath(`/table/${destinationOpenSession.publicToken}`);
      }
      await notifyFloorChanged("table-transfer-updated");

      return {
        message: `Moved session #${session.id} to ${formatTableLabel(destinationTable)}.`,
        status: "approved",
      };
    }

    const existingPendingRequest =
      await prisma.tableSessionTransferRequest.findFirst({
        where: {
          tableSessionId: session.id,
          status: TableSessionTransferStatus.PENDING,
        },
      });

    if (existingPendingRequest) {
      throw new Error("This session already has a pending transfer request.");
    }

    const transferRequest = await prisma.tableSessionTransferRequest.create({
      data: {
        tableSessionId: session.id,
        requestedByEmployeeId: employee.id,
        fromTableId: session.tableId,
        toTableId: destinationTable.id,
      },
    });

    await writeAuditEvent({
      action: "TABLE_SESSION_TRANSFER_REQUESTED",
      employeeProfileId: employee.id,
      entityType: "TableSessionTransferRequest",
      entityId: transferRequest.id,
      metadata: {
        tableSessionId: session.id,
        publicToken: session.publicToken,
        fromTableId: session.tableId,
        fromTableLabel: formatTableLabel(session.table),
        toTableId: destinationTable.id,
        toTableLabel: formatTableLabel(destinationTable),
      },
    });

    revalidatePath("/staff/tables");
    await notifyFloorChanged("table-transfer-updated");

    return {
      message: `Transfer request sent for manager approval: ${formatTableLabel(session.table)} to ${formatTableLabel(destinationTable)}.`,
      status: "requested",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not request table transfer.",
      status: "error",
    };
  }
}

// Manager/owner approval is the only place where the table session actually moves.
export async function respondToTableSessionTransferAction(
  _previousState: TransferTableSessionState,
  formData: FormData,
): Promise<TransferTableSessionState> {
  try {
    const employee = await requireActiveEmployee();

    if (!canManageFloorActions(employee.role)) {
      throw new Error("Only managers and owners can approve table transfers.");
    }

    const approval = await getFloorActionApprover({ employee, formData });
    const transferRequestId = readPositiveInteger(formData, "transferRequestId");
    const decision = formData.get("decision");

    if (decision !== "approve" && decision !== "deny") {
      throw new Error("Choose approve or deny.");
    }

    const transferRequest = await prisma.tableSessionTransferRequest.findUnique({
      where: { id: transferRequestId },
      include: {
        fromTable: true,
        tableSession: true,
        toTable: true,
      },
    });

    if (
      !transferRequest ||
      transferRequest.status !== TableSessionTransferStatus.PENDING
    ) {
      throw new Error("Transfer request is no longer pending.");
    }

    if (decision === "deny") {
      await prisma.tableSessionTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          reviewedByEmployeeId: employee.id,
          status: TableSessionTransferStatus.DENIED,
          respondedAt: new Date(),
        },
      });

      await writeAuditEvent({
        action: "TABLE_SESSION_TRANSFER_DENIED",
        employeeProfileId: employee.id,
        entityType: "TableSessionTransferRequest",
        entityId: transferRequest.id,
        metadata: {
          tableSessionId: transferRequest.tableSessionId,
          fromTableId: transferRequest.fromTableId,
          fromTableLabel: formatTableLabel(transferRequest.fromTable),
          toTableId: transferRequest.toTableId,
          toTableLabel: formatTableLabel(transferRequest.toTable),
          ...approval,
        },
      });

      revalidatePath("/staff/tables");
      await notifyFloorChanged("table-transfer-updated");

      return {
        message: `Denied transfer request #${transferRequest.id}.`,
        status: "denied",
      };
    }

    const { destinationOpenSession, destinationTable } =
      await getTransferDestination(transferRequest.toTableId);

    if (transferRequest.tableSession.status !== TableSessionStatus.OPEN) {
      throw new Error("Only open table sessions can be transferred.");
    }

    await prisma.$transaction([
      ...(destinationOpenSession
        ? [
            prisma.tableSession.update({
              where: { id: destinationOpenSession.id },
              data: {
                status: TableSessionStatus.CANCELLED,
                closedAt: new Date(),
              },
            }),
          ]
        : []),
      prisma.tableSession.update({
        where: { id: transferRequest.tableSessionId },
        data: { tableId: destinationTable.id },
      }),
      prisma.tableSessionTransferRequest.update({
        where: { id: transferRequest.id },
        data: {
          reviewedByEmployeeId: employee.id,
          status: TableSessionTransferStatus.APPROVED,
          respondedAt: new Date(),
        },
      }),
    ]);

    await writeAuditEvent({
      action: "TABLE_SESSION_TRANSFERRED",
      employeeProfileId: employee.id,
      entityType: "TableSession",
      entityId: transferRequest.tableSessionId,
      metadata: {
        transferRequestId: transferRequest.id,
        publicToken: transferRequest.tableSession.publicToken,
        fromTableId: transferRequest.fromTableId,
        fromTableLabel: formatTableLabel(transferRequest.fromTable),
        toTableId: destinationTable.id,
        toTableLabel: formatTableLabel(destinationTable),
        cancelledEmptyDestinationSessionId: destinationOpenSession?.id,
        cancelledEmptyDestinationToken: destinationOpenSession?.publicToken,
        ...approval,
      },
    });

    revalidatePath("/staff/tables");
    revalidatePath(`/table/${transferRequest.tableSession.publicToken}`);
    if (destinationOpenSession) {
      revalidatePath(`/table/${destinationOpenSession.publicToken}`);
    }
    await notifyFloorChanged("table-transfer-updated");

    return {
      message: `Approved move to ${formatTableLabel(destinationTable)}.`,
      status: "approved",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not respond to table transfer.",
      status: "error",
    };
  }
}
