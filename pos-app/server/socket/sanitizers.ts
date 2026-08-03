// Sanitize any client-provided display value before it touches logs or the DB.
export function getSafeGuestName(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const guestName = value.trim();

  if (!guestName) {
    return undefined;
  }

  return guestName.slice(0, 30);
}

// User ids come from Better Auth session cookies, not from browser payloads.
export function getSafeUserId(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const userId = value.trim();

  if (!userId) {
    return undefined;
  }

  return userId.slice(0, 128);
}

// Participant public ids may be created by the browser before first join so
// duplicate first-load socket joins still map to the same guest row.
export function getSafeParticipantPublicId(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const publicId = value.trim();

  if (!/^[A-Za-z0-9_-]{12,80}$/.test(publicId)) {
    return undefined;
  }

  return publicId;
}
