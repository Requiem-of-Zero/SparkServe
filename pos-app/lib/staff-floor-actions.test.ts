import { describe, expect, it } from "vitest";

import { EmployeeRole } from "./generated/prisma/enums";
import { canManageFloorActions } from "./staff-floor-actions";

describe("canManageFloorActions", () => {
  it("allows owners and managers to move or protect table sessions", () => {
    expect(canManageFloorActions(EmployeeRole.OWNER)).toBe(true);
    expect(canManageFloorActions(EmployeeRole.MANAGER)).toBe(true);
  });

  it("blocks cashiers from sensitive floor actions", () => {
    expect(canManageFloorActions(EmployeeRole.CASHIER)).toBe(false);
  });
});
