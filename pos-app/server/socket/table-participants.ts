import { randomBytes } from "node:crypto";

import { TableSessionParticipantRole } from "../../lib/generated/prisma/enums";
import { prisma } from "../../lib/prisma";

// Gives a new guest the next numbered label for the table session.
async function assignTableGuestName(
  tableSessionId: number,
  guestLabelBase: string,
) {
  const existingParticipantCount = await prisma.tableSessionParticipant.count({
    where: {
      tableSessionId,
    },
  });
  const nextGuestNumber = existingParticipantCount + 1;

  return `${guestLabelBase} ${nextGuestNumber}`;
}

// Public participant ids are stored in the browser and identify one table device.
function createParticipantPublicId() {
  return randomBytes(18).toString("base64url");
}

// Avoid rare collisions so public ids can be safely used as table participant handles.
async function createUniqueParticipantPublicId() {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const publicId = createParticipantPublicId();
    const existingParticipant = await prisma.tableSessionParticipant.findUnique(
      {
        where: { publicId },
      },
    );

    if (!existingParticipant) {
      return publicId;
    }
  }

  throw new Error("Could not create a unique participant id.");
}

// Creates a participant for a new browser/device joining the table session.
export async function createTableSessionParticipant({
  tableSessionId,
  displayNameBase,
  isGuest,
  preferredPublicId,
  userId,
}: {
  tableSessionId: number;
  displayNameBase: string;
  isGuest: boolean;
  preferredPublicId?: string;
  userId?: string;
}) {
  const existingParticipantCount = await prisma.tableSessionParticipant.count({
    where: { tableSessionId },
  });
  const role =
    existingParticipantCount === 0
      ? TableSessionParticipantRole.OWNER
      : TableSessionParticipantRole.GUEST;
  const displayName = isGuest
    ? await assignTableGuestName(tableSessionId, displayNameBase)
    : displayNameBase;

  const publicId =
    preferredPublicId ?? (await createUniqueParticipantPublicId());

  try {
    return await prisma.tableSessionParticipant.create({
      data: {
        tableSessionId,
        userId,
        publicId,
        displayName,
        role,
      },
    });
  } catch (error) {
    if (!preferredPublicId) {
      throw error;
    }

    const existingParticipant = await prisma.tableSessionParticipant.findUnique(
      {
        where: { publicId: preferredPublicId },
      },
    );

    if (existingParticipant?.tableSessionId === tableSessionId) {
      return existingParticipant;
    }

    throw error;
  }
}
