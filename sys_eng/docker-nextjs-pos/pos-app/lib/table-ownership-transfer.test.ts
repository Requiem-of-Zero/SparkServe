import { describe, expect, it } from "vitest";

import {
  canParticipantRespondToOwnershipTransfer,
  getOwnershipTransferOptions,
  getPendingOwnershipTransferForParticipant,
} from "./table-ownership-transfer";
import { canTableAcceptOrders } from "./table-owner-verification";

describe("table ownership transfer", () => {
  it("only offers transfer targets that are not the current owner", () => {
    const options = getOwnershipTransferOptions({
      currentParticipantPublicId: "owner-public-id",
      participants: [
        { publicId: "owner-public-id", role: "OWNER" },
        { publicId: "guest-a", role: "GUEST" },
        { publicId: "guest-b", role: "GUEST" },
      ],
    });

    expect(options).toEqual([
      { publicId: "guest-a", role: "GUEST" },
      { publicId: "guest-b", role: "GUEST" },
    ]);
  });

  it("shows the accept or deny prompt only to the requested target", () => {
    const pendingTransfers = [
      { id: 20, targetParticipantPublicId: "guest-a" },
    ];

    expect(
      getPendingOwnershipTransferForParticipant({
        pendingTransfers,
        participantPublicId: "guest-a",
      }),
    ).toEqual({ id: 20, targetParticipantPublicId: "guest-a" });

    expect(
      getPendingOwnershipTransferForParticipant({
        pendingTransfers,
        participantPublicId: "guest-b",
      }),
    ).toBeUndefined();
  });

  it("allows only the transfer target to respond while the request is pending", () => {
    expect(
      canParticipantRespondToOwnershipTransfer({
        transferTargetParticipantId: 2,
        participantId: 2,
        transferStatus: "PENDING",
      }),
    ).toBe(true);

    expect(
      canParticipantRespondToOwnershipTransfer({
        transferTargetParticipantId: 2,
        participantId: 3,
        transferStatus: "PENDING",
      }),
    ).toBe(false);

    expect(
      canParticipantRespondToOwnershipTransfer({
        transferTargetParticipantId: 2,
        participantId: 2,
        transferStatus: "ACCEPTED",
      }),
    ).toBe(false);
  });

  it("requires the new owner to reverify before orders can continue", () => {
    expect(
      canTableAcceptOrders({
        sessionStatus: "OPEN",
        ownerPhoneVerifiedAt: null,
      }),
    ).toBe(false);
  });
});
