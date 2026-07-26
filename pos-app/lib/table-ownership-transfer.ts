export type OwnershipParticipant = {
  publicId: string;
  displayName?: string;
  role: string;
};

export type PendingOwnershipTransfer = {
  id: number;
  targetParticipantPublicId: string;
  requestedByDisplayName?: string;
};

// Owner can only offer transfer to another non-owner participant at the table.
export function getOwnershipTransferOptions({
  participants,
  currentParticipantPublicId,
}: {
  participants: OwnershipParticipant[];
  currentParticipantPublicId?: string;
}) {
  return participants.filter(
    (participant) =>
      participant.publicId !== currentParticipantPublicId &&
      participant.role !== "OWNER",
  );
}

// Only the requested target should see the accept/deny prompt on their page.
export function getPendingOwnershipTransferForParticipant({
  pendingTransfers,
  participantPublicId,
}: {
  pendingTransfers: PendingOwnershipTransfer[];
  participantPublicId?: string;
}) {
  if (!participantPublicId) {
    return undefined;
  }

  return pendingTransfers.find(
    (transfer) => transfer.targetParticipantPublicId === participantPublicId,
  );
}

export function canParticipantRespondToOwnershipTransfer({
  transferTargetParticipantId,
  participantId,
  transferStatus,
}: {
  transferTargetParticipantId: number;
  participantId: number;
  transferStatus: string;
}) {
  return transferStatus === "PENDING" && transferTargetParticipantId === participantId;
}
