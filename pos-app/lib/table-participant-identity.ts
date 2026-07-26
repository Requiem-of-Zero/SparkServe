export type ParticipantIdentityRole = "OWNER" | "GUEST";

// Small shape shared by the realtime server and tests. Keeping this pure lets
// us verify table identity behavior without needing Socket.IO or a database.
export type ParticipantIdentity = {
  id: number;
  publicId: string;
  tableSessionId: number;
  userId: string | null;
  displayName: string;
  role: ParticipantIdentityRole;
};

export type ResolveParticipantIdentityInput = {
  tableSessionId: number;
  tableLabel: string;
  accountDisplayName?: string;
  signedInUserId?: string;
  savedParticipantPublicId?: string;
  existingParticipants: ParticipantIdentity[];
};

export type ResolveParticipantIdentityResult =
  | {
      action: "create";
      displayNameBase: string;
      isGuest: boolean;
      role: ParticipantIdentityRole;
      userId?: string;
    }
  | {
      action: "use-existing";
      participant: ParticipantIdentity;
    }
  | {
      action: "attach-account-to-device";
      participant: ParticipantIdentity;
      userId: string;
      displayName: string;
    }
  | {
      action: "refresh-account-name";
      participant: ParticipantIdentity;
      displayName: string;
    }
  | {
      action: "detach-account-from-device";
      participant: ParticipantIdentity;
      displayName: string;
    }
  | {
      action: "restore-guest-name";
      participant: ParticipantIdentity;
      displayName: string;
    };

function getGuestDisplayName({
  participant,
  participants,
  tableLabel,
}: {
  participant: ParticipantIdentity;
  participants: ParticipantIdentity[];
  tableLabel: string;
}) {
  // Guest numbers are based on join order within the table session, so logging
  // out can restore "Table Guest 1" for the same device instead of account name.
  const orderedParticipants = [...participants].sort((first, second) => {
    if (first.id !== second.id) {
      return first.id - second.id;
    }

    return first.publicId.localeCompare(second.publicId);
  });
  const participantIndex = orderedParticipants.findIndex(
    (currentParticipant) => currentParticipant.id === participant.id,
  );

  return `${tableLabel} Guest ${participantIndex >= 0 ? participantIndex + 1 : 1}`;
}

export function resolveParticipantIdentity({
  tableSessionId,
  tableLabel,
  accountDisplayName,
  signedInUserId,
  savedParticipantPublicId,
  existingParticipants,
}: ResolveParticipantIdentityInput): ResolveParticipantIdentityResult {
  // The saved participant public id represents this browser/device at the table.
  // The signed-in user id represents loyalty/account identity. They are separate
  // so guests can log in and out without losing table ownership.
  const existingDeviceParticipant = savedParticipantPublicId
    ? existingParticipants.find(
        (participant) =>
          participant.publicId === savedParticipantPublicId &&
          participant.tableSessionId === tableSessionId,
      )
    : undefined;
  const existingUserParticipant = signedInUserId
    ? existingParticipants.find(
        (participant) =>
          participant.userId === signedInUserId &&
          participant.tableSessionId === tableSessionId,
      )
    : undefined;
  const existingDeviceGuestName = existingDeviceParticipant
    ? getGuestDisplayName({
        participant: existingDeviceParticipant,
        participants: existingParticipants,
        tableLabel,
      })
    : undefined;

  if (signedInUserId && existingDeviceParticipant?.userId === null) {
    return {
      action: "attach-account-to-device",
      participant: existingDeviceParticipant,
      userId: signedInUserId,
      displayName:
        accountDisplayName ?? existingDeviceParticipant.displayName,
    };
  }

  if (
    signedInUserId &&
    existingUserParticipant &&
    accountDisplayName &&
    existingUserParticipant.displayName !== accountDisplayName
  ) {
    return {
      action: "refresh-account-name",
      participant: existingUserParticipant,
      displayName: accountDisplayName,
    };
  }

  if (!signedInUserId && existingDeviceParticipant?.userId) {
    return {
      action: "detach-account-from-device",
      participant: existingDeviceParticipant,
      displayName: existingDeviceGuestName ?? `${tableLabel} Guest 1`,
    };
  }

  if (
    !signedInUserId &&
    existingDeviceParticipant &&
    existingDeviceGuestName &&
    existingDeviceParticipant.displayName !== existingDeviceGuestName
  ) {
    return {
      action: "restore-guest-name",
      participant: existingDeviceParticipant,
      displayName: existingDeviceGuestName,
    };
  }

  if (existingUserParticipant) {
    return {
      action: "use-existing",
      participant: existingUserParticipant,
    };
  }

  if (existingDeviceParticipant) {
    return {
      action: "use-existing",
      participant: existingDeviceParticipant,
    };
  }

  return {
    action: "create",
    displayNameBase: accountDisplayName ?? `${tableLabel} Guest`,
    isGuest: !accountDisplayName,
    role: existingParticipants.length === 0 ? "OWNER" : "GUEST",
    userId: signedInUserId,
  };
}
