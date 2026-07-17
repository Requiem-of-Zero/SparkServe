import { headers } from "next/headers";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditLogInput = {
  action: string;
  employeeProfileId?: number | null;
  entityType?: string | null;
  entityId?: string | number | null;
  metadata?: Prisma.InputJsonValue;
};

// Central helper for recording staff-sensitive events with request context.
export async function writeAuditEvent({
  action,
  employeeProfileId,
  entityType,
  entityId,
  metadata,
}: AuditLogInput) {
  const requestHeaders = await headers();

  await prisma.auditEvent.create({
    data: {
      action,
      employeeProfileId,
      entityType,
      entityId: entityId == null ? null : String(entityId),
      metadata,
      ipAddress:
        requestHeaders.get("x-forwarded-for") ??
        requestHeaders.get("x-real-ip"),
      userAgent: requestHeaders.get("user-agent"),
    },
  });
}
