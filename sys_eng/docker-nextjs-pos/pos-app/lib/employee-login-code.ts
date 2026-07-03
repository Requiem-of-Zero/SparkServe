import { randomInt } from "node:crypto";

// Generates the owner-distributed 6-digit employee login code.
export function generateEmployeeLoginCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
