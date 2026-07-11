export type TableOwnerRole = "OWNER" | "GUEST";

export type TableSessionStatusLike =
  | "OPEN"
  | "SUBMITTED"
  | "CHECKED_OUT"
  | "CANCELLED";

export function isValidAttendeeCount(attendeeCount: number) {
  return Number.isInteger(attendeeCount) && attendeeCount >= 1 && attendeeCount <= 99;
}

export function isSixDigitVerificationCode(value: string) {
  return /^\d{6}$/.test(value);
}

export function canParticipantRequestOwnerVerification({
  tableSessionId,
  participantTableSessionId,
  participantRole,
  sessionStatus,
}: {
  tableSessionId: number;
  participantTableSessionId: number;
  participantRole: TableOwnerRole;
  sessionStatus: TableSessionStatusLike;
}) {
  return (
    sessionStatus === "OPEN" &&
    participantRole === "OWNER" &&
    tableSessionId === participantTableSessionId
  );
}

export function canTableAcceptOrders({
  sessionStatus,
  ownerPhoneVerifiedAt,
}: {
  sessionStatus: TableSessionStatusLike;
  ownerPhoneVerifiedAt?: Date | string | null;
}) {
  return sessionStatus === "OPEN" && Boolean(ownerPhoneVerifiedAt);
}

export function canSubmitKitchenOrder({
  sessionStatus,
  ownerPhoneVerifiedAt,
  orderVerificationRequired,
  hasPendingVerificationCode,
}: {
  sessionStatus: TableSessionStatusLike;
  ownerPhoneVerifiedAt?: Date | string | null;
  orderVerificationRequired: boolean;
  hasPendingVerificationCode: boolean;
}) {
  if (!canTableAcceptOrders({ sessionStatus, ownerPhoneVerifiedAt })) {
    return false;
  }

  return !orderVerificationRequired || hasPendingVerificationCode;
}
