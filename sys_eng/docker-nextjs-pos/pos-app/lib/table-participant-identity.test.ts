import { describe, expect, it } from "vitest";

import {
  resolveParticipantIdentity,
  type ParticipantIdentity,
} from "./table-participant-identity";

const tableSessionId = 10;
const tableLabel = "C1 Booth";

function participant(
  overrides: Partial<ParticipantIdentity>,
): ParticipantIdentity {
  return {
    id: 1,
    publicId: "device-owner",
    tableSessionId,
    userId: null,
    displayName: "C1 Booth Guest 1",
    role: "OWNER",
    ...overrides,
  };
}

describe("resolveParticipantIdentity", () => {
  it("creates the first QR guest as the table session owner", () => {
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      existingParticipants: [],
    });

    expect(result).toEqual({
      action: "create",
      displayNameBase: "C1 Booth Guest",
      isGuest: true,
      role: "OWNER",
      userId: undefined,
    });
  });

  it("attaches a signed-in loyalty account to the same owner device public id", () => {
    const owner = participant({});
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      signedInUserId: "user-google-1",
      accountDisplayName: "Samuel Wong",
      savedParticipantPublicId: owner.publicId,
      existingParticipants: [owner],
    });

    expect(result).toEqual({
      action: "attach-account-to-device",
      participant: owner,
      userId: "user-google-1",
      displayName: "Samuel Wong",
    });
  });

  it("does not create a new owner when the owner logs in for loyalty points", () => {
    const owner = participant({});
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      signedInUserId: "user-google-1",
      accountDisplayName: "Samuel Wong",
      savedParticipantPublicId: owner.publicId,
      existingParticipants: [owner],
    });

    expect(result.action).not.toBe("create");
    expect(result).toMatchObject({
      participant: expect.objectContaining({
        publicId: "device-owner",
        role: "OWNER",
      }),
    });
  });

  it("detaches the loyalty account on logout and restores the same owner guest name", () => {
    const signedInOwner = participant({
      userId: "user-google-1",
      displayName: "Samuel Wong",
    });
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      savedParticipantPublicId: signedInOwner.publicId,
      existingParticipants: [signedInOwner],
    });

    expect(result).toEqual({
      action: "detach-account-from-device",
      participant: signedInOwner,
      displayName: "C1 Booth Guest 1",
    });
  });

  it("keeps the owner role on the same public id after logout", () => {
    const signedInOwner = participant({
      userId: "user-google-1",
      displayName: "Samuel Wong",
    });
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      savedParticipantPublicId: signedInOwner.publicId,
      existingParticipants: [signedInOwner],
    });

    expect(result).toMatchObject({
      participant: expect.objectContaining({
        publicId: "device-owner",
        role: "OWNER",
      }),
    });
  });

  it("restores the numbered guest name if a signed-out row still has the account name", () => {
    const staleSignedOutOwner = participant({
      userId: null,
      displayName: "Samuel Wong",
    });
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      savedParticipantPublicId: staleSignedOutOwner.publicId,
      existingParticipants: [staleSignedOutOwner],
    });

    expect(result).toEqual({
      action: "restore-guest-name",
      participant: staleSignedOutOwner,
      displayName: "C1 Booth Guest 1",
    });
  });

  it("creates later QR guests as guests, not owners", () => {
    const owner = participant({});
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      existingParticipants: [owner],
    });

    expect(result).toEqual({
      action: "create",
      displayNameBase: "C1 Booth Guest",
      isGuest: true,
      role: "GUEST",
      userId: undefined,
    });
  });

  it("keeps a later signed-in guest as a guest when they join with their own public id", () => {
    const owner = participant({});
    const guest = participant({
      id: 2,
      publicId: "device-guest",
      displayName: "C1 Booth Guest 2",
      role: "GUEST",
    });
    const result = resolveParticipantIdentity({
      tableSessionId,
      tableLabel,
      signedInUserId: "user-google-2",
      accountDisplayName: "Loyalty Member",
      savedParticipantPublicId: guest.publicId,
      existingParticipants: [owner, guest],
    });

    expect(result).toEqual({
      action: "attach-account-to-device",
      participant: guest,
      userId: "user-google-2",
      displayName: "Loyalty Member",
    });
    expect(result).toMatchObject({
      participant: expect.objectContaining({
        role: "GUEST",
      }),
    });
  });
});
