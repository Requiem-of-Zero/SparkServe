import { describe, expect, it } from "vitest";

import {
  canParticipantRequestOwnerVerification,
  canSubmitKitchenOrder,
  canTableAcceptOrders,
  isSixDigitVerificationCode,
  isValidAttendeeCount,
} from "./table-owner-verification";

describe("table owner verification", () => {
  it("blocks ordering before the table owner verifies by phone", () => {
    expect(
      canTableAcceptOrders({
        sessionStatus: "OPEN",
        ownerPhoneVerifiedAt: null,
      }),
    ).toBe(false);
  });

  it("allows ordering after the table owner verifies by phone", () => {
    expect(
      canTableAcceptOrders({
        sessionStatus: "OPEN",
        ownerPhoneVerifiedAt: new Date("2026-07-06T12:00:00Z"),
      }),
    ).toBe(true);
  });

  it("blocks ordering after the table session is no longer open", () => {
    expect(
      canTableAcceptOrders({
        sessionStatus: "CHECKED_OUT",
        ownerPhoneVerifiedAt: new Date("2026-07-06T12:00:00Z"),
      }),
    ).toBe(false);
  });

  it("only lets the owner participant request phone verification", () => {
    expect(
      canParticipantRequestOwnerVerification({
        tableSessionId: 10,
        participantTableSessionId: 10,
        participantRole: "OWNER",
        sessionStatus: "OPEN",
      }),
    ).toBe(true);

    expect(
      canParticipantRequestOwnerVerification({
        tableSessionId: 10,
        participantTableSessionId: 10,
        participantRole: "GUEST",
        sessionStatus: "OPEN",
      }),
    ).toBe(false);
  });

  it("rejects owner verification from another table session", () => {
    expect(
      canParticipantRequestOwnerVerification({
        tableSessionId: 10,
        participantTableSessionId: 99,
        participantRole: "OWNER",
        sessionStatus: "OPEN",
      }),
    ).toBe(false);
  });

  it("accepts attendee counts between 1 and 99", () => {
    expect(isValidAttendeeCount(1)).toBe(true);
    expect(isValidAttendeeCount(99)).toBe(true);
    expect(isValidAttendeeCount(0)).toBe(false);
    expect(isValidAttendeeCount(100)).toBe(false);
    expect(isValidAttendeeCount(2.5)).toBe(false);
  });

  it("requires exactly six numeric verification digits", () => {
    expect(isSixDigitVerificationCode("123456")).toBe(true);
    expect(isSixDigitVerificationCode("12345")).toBe(false);
    expect(isSixDigitVerificationCode("1234567")).toBe(false);
    expect(isSixDigitVerificationCode("12a456")).toBe(false);
  });

  it("requires a fresh pending verification code before kitchen submit", () => {
    expect(
      canSubmitKitchenOrder({
        sessionStatus: "OPEN",
        ownerPhoneVerifiedAt: new Date("2026-07-09T12:00:00Z"),
        orderVerificationRequired: true,
        hasPendingVerificationCode: false,
      }),
    ).toBe(false);

    expect(
      canSubmitKitchenOrder({
        sessionStatus: "OPEN",
        ownerPhoneVerifiedAt: new Date("2026-07-09T12:00:00Z"),
        orderVerificationRequired: true,
        hasPendingVerificationCode: true,
      }),
    ).toBe(true);
  });

  it("allows kitchen submit without per-order code when owner disables it", () => {
    expect(
      canSubmitKitchenOrder({
        sessionStatus: "OPEN",
        ownerPhoneVerifiedAt: new Date("2026-07-09T12:00:00Z"),
        orderVerificationRequired: false,
        hasPendingVerificationCode: false,
      }),
    ).toBe(true);
  });
});
