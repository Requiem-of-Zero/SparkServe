"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit-log";
import { requireActiveEmployee } from "@/lib/employee-auth";
import { notifyFloorChanged } from "@/lib/floor-realtime";
import {
  TableSessionStatus,
  TableSessionTransferStatus,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { canManageFloorActions } from "@/lib/staff-floor-actions";

export type TransferTableSessionState = {
  message?: string;
  status: "idle" | "requested" | "approved" | "denied" | "error";
};

function readPositiveInteger(formData: FormData, key: string) {
  const value = Number(formData.get(key));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
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
