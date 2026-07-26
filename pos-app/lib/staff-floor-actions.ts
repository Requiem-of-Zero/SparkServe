import { EmployeeRole } from "./generated/prisma/enums";

// Sensitive floor actions are available to manager-level staff and owners.
export function canManageFloorActions(role: EmployeeRole | string) {
  return role === EmployeeRole.MANAGER || role === EmployeeRole.OWNER;
}
