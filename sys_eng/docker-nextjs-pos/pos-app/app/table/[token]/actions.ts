"use server";

import { createHash, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  OwnershipTransferStatus,
  TableSessionParticipantRole,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  canParticipantRequestOwnerVerification,
  isSixDigitVerificationCode,
  isValidAttendeeCount,
  type TableOwnerRole,
  type TableSessionStatusLike,
} from "@/lib/table-owner-verification";

export type OwnerVerificationState = {
  devCode?: string;
  message?: string;
  status: "idle" | "code-sent" | "verified" | "error";
};

export type OwnershipTransferState = {
  message?: string;
  status: "idle" | "requested" | "accepted" | "denied" | "error";
};

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

// Verification codes are stored hashed so plaintext codes are never persisted.
function hashVerificationCode({
  code,
  participantPublicId,
}: {
  code: string;
  participantPublicId: string;
}) {
  const secret = process.env.BETTER_AUTH_SECRET ?? "local-dev-secret";

  return createHash("sha256")
    .update(`${code}:${participantPublicId}:${secret}`)
    .digest("hex");
}

// Dev-only code generator for now; later this code will be sent by SMS.
function generateVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Central guard for owner-only table actions.
async function requireOwnerParticipant({
  token,
  participantPublicId,
}: {
  token: string;
  participantPublicId: string;
}) {
  const session = await prisma.tableSession.findUnique({
    where: { publicToken: token },
  });

  if (!session || session.status !== "OPEN") {
    throw new Error("Table session is not open.");
  }

  const participant = await prisma.tableSessionParticipant.findUnique({
    where: { publicId: participantPublicId },
  });

  if (
    !participant ||
    !canParticipantRequestOwnerVerification({
      tableSessionId: session.id,
      participantTableSessionId: participant.tableSessionId,
      participantRole: participant.role as TableOwnerRole,
      sessionStatus: session.status as TableSessionStatusLike,
    })
  ) {
    throw new Error("Only the table session owner can do this.");
  }

  return { participant, session };
}

// Owner starts a transfer request; the target participant must accept it.
export async function requestOwnershipTransferAction(
  _previousState: OwnershipTransferState,
  formData: FormData,
): Promise<OwnershipTransferState> {
  try {
    const token = readRequiredString(formData, "token");
    const ownerParticipantPublicId = readRequiredString(
      formData,
      "ownerParticipantPublicId",
    );
    const targetParticipantPublicId = readRequiredString(
      formData,
      "targetParticipantPublicId",
    );
    const { participant: ownerParticipant, session } = await requireOwnerParticipant({
      token,
      participantPublicId: ownerParticipantPublicId,
    });
    const targetParticipant = await prisma.tableSessionParticipant.findUnique({
      where: { publicId: targetParticipantPublicId },
    });

    if (
      !targetParticipant ||
      targetParticipant.tableSessionId !== session.id ||
      targetParticipant.id === ownerParticipant.id
    ) {
      throw new Error("Choose another guest at this table.");
    }

    await prisma.$transaction([
      prisma.tableSessionOwnershipTransfer.updateMany({
        where: {
          tableSessionId: session.id,
          status: OwnershipTransferStatus.PENDING,
        },
        data: {
          status: OwnershipTransferStatus.CANCELLED,
          respondedAt: new Date(),
        },
      }),
      prisma.tableSessionOwnershipTransfer.create({
        data: {
          tableSessionId: session.id,
          requestedByParticipantId: ownerParticipant.id,
          targetParticipantId: targetParticipant.id,
        },
      }),
    ]);

    revalidatePath(`/table/${token}`);

    return {
      message: `Ownership request sent to ${targetParticipant.displayName}.`,
      status: "requested",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not request ownership transfer.",
      status: "error",
    };
  }
}

export async function respondToOwnershipTransferAction(
  _previousState: OwnershipTransferState,
  formData: FormData,
): Promise<OwnershipTransferState> {
  try {
    const token = readRequiredString(formData, "token");
    const participantPublicId = readRequiredString(
      formData,
      "participantPublicId",
    );
    const transferId = Number(formData.get("transferId"));
    const decision = readRequiredString(formData, "decision");

    if (!Number.isInteger(transferId)) {
      throw new Error("Transfer request is invalid.");
    }

    if (decision !== "accept" && decision !== "deny") {
      throw new Error("Choose accept or deny.");
    }

    const session = await prisma.tableSession.findUnique({
      where: { publicToken: token },
    });

    if (!session || session.status !== "OPEN") {
      throw new Error("Table session is not open.");
    }

    const participant = await prisma.tableSessionParticipant.findUnique({
      where: { publicId: participantPublicId },
    });

    if (!participant || participant.tableSessionId !== session.id) {
      throw new Error("Join this table before responding.");
    }

    const transfer = await prisma.tableSessionOwnershipTransfer.findUnique({
      where: { id: transferId },
    });

    if (
      !transfer ||
      transfer.tableSessionId !== session.id ||
      transfer.targetParticipantId !== participant.id ||
      transfer.status !== OwnershipTransferStatus.PENDING
    ) {
      throw new Error("Ownership transfer request is no longer available.");
    }

    if (decision === "deny") {
      await prisma.tableSessionOwnershipTransfer.update({
        where: { id: transfer.id },
        data: {
          status: OwnershipTransferStatus.DENIED,
          respondedAt: new Date(),
        },
      });

      revalidatePath(`/table/${token}`);

      return {
        message: "Ownership transfer denied.",
        status: "denied",
      };
    }

    // Accepting transfer demotes any current owner and promotes the target.
    await prisma.$transaction([
      prisma.tableSessionParticipant.updateMany({
        where: {
          tableSessionId: session.id,
          role: TableSessionParticipantRole.OWNER,
        },
        data: { role: TableSessionParticipantRole.GUEST },
      }),
      prisma.tableSessionParticipant.update({
        where: { id: participant.id },
        data: { role: TableSessionParticipantRole.OWNER },
      }),
      prisma.tableSessionOwnershipTransfer.update({
        where: { id: transfer.id },
        data: {
          status: OwnershipTransferStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      }),
      prisma.tableSessionOwnershipTransfer.updateMany({
        where: {
          tableSessionId: session.id,
          status: OwnershipTransferStatus.PENDING,
          id: { not: transfer.id },
        },
        data: {
          status: OwnershipTransferStatus.CANCELLED,
          respondedAt: new Date(),
        },
      }),
    ]);

    revalidatePath(`/table/${token}`);

    return {
      message: "You are now the table session owner.",
      status: "accepted",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not respond to transfer request.",
      status: "error",
    };
  }
}

export async function requestOwnerPhoneVerificationAction(
  _previousState: OwnerVerificationState,
  formData: FormData,
): Promise<OwnerVerificationState> {
  try {
    const token = readRequiredString(formData, "token");
    const participantPublicId = readRequiredString(
      formData,
      "participantPublicId",
    );
    const phoneNumber = readRequiredString(formData, "phoneNumber");
    const attendeeCount = Number(formData.get("attendeeCount"));

    if (!isValidAttendeeCount(attendeeCount)) {
      throw new Error("Attendee count must be between 1 and 99.");
    }

    const { participant, session } = await requireOwnerParticipant({
      token,
      participantPublicId,
    });
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save attendee count on the session and the pending phone code on owner.
    await prisma.$transaction([
      prisma.tableSession.update({
        where: { id: session.id },
        data: { attendeeCount },
      }),
      prisma.tableSessionParticipant.update({
        where: { id: participant.id },
        data: {
          phoneNumber,
          phoneVerificationCodeHash: hashVerificationCode({
            code,
            participantPublicId,
          }),
          phoneVerificationExpiresAt: expiresAt,
          phoneVerifiedAt: null,
        },
      }),
    ]);

    return {
      devCode: code,
      message: "Verification code generated. SMS provider comes later.",
      status: "code-sent",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Could not send code.",
      status: "error",
    };
  }
}

export async function verifyOwnerPhoneCodeAction(
  _previousState: OwnerVerificationState,
  formData: FormData,
): Promise<OwnerVerificationState> {
  try {
    const token = readRequiredString(formData, "token");
    const participantPublicId = readRequiredString(
      formData,
      "participantPublicId",
    );
    const code = readRequiredString(formData, "verificationCode");

    if (!isSixDigitVerificationCode(code)) {
      throw new Error("Verification code must be 6 digits.");
    }

    const { participant } = await requireOwnerParticipant({
      token,
      participantPublicId,
    });

    if (
      !participant.phoneVerificationCodeHash ||
      !participant.phoneVerificationExpiresAt
    ) {
      throw new Error("Request a verification code first.");
    }

    if (participant.phoneVerificationExpiresAt < new Date()) {
      throw new Error("Verification code expired.");
    }

    const submittedCodeHash = hashVerificationCode({
      code,
      participantPublicId,
    });

    if (submittedCodeHash !== participant.phoneVerificationCodeHash) {
      throw new Error("Verification code is incorrect.");
    }

    // Once verified, ordering opens for all table participants.
    await prisma.tableSessionParticipant.update({
      where: { id: participant.id },
      data: {
        phoneVerificationCodeHash: null,
        phoneVerificationExpiresAt: null,
        phoneVerifiedAt: new Date(),
      },
    });

    revalidatePath(`/table/${token}`);

    return {
      message: "Phone verified for this table session.",
      status: "verified",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Could not verify code.",
      status: "error",
    };
  }
}
