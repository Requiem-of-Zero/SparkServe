import { EmployeeRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const managerApprovalRoles = new Set<EmployeeRole>([
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
]);

function readManagerApprovalCode(formData: FormData) {
  const code = formData.get("managerApprovalCode");

  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    throw new Error("Enter a valid 6-digit manager code.");
  }

  return code.trim();
}

// Verifies that a sensitive floor action was approved by an active manager or owner code.
export async function requireManagerApprovalCode(formData: FormData) {
  const managerApprovalCode = readManagerApprovalCode(formData);
  const approvingEmployee = await prisma.employeeProfile.findUnique({
    where: { loginCode: managerApprovalCode },
    select: {
      active: true,
      firstName: true,
      id: true,
      lastName: true,
      resignedAt: true,
      role: true,
      user: {
        select: {
          displayUsername: true,
          name: true,
        },
      },
    },
  });

  if (
    !approvingEmployee ||
    !approvingEmployee.active ||
    approvingEmployee.resignedAt ||
    !managerApprovalRoles.has(approvingEmployee.role)
  ) {
    throw new Error("Manager approval code was not accepted.");
  }

  return approvingEmployee;
}

export function getApprovalEmployeeDisplayName(employee: {
  firstName: string | null;
  lastName: string | null;
  user: {
    displayUsername: string | null;
    name: string;
  };
}) {
  const structuredName = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ");

  return structuredName || employee.user.displayUsername || employee.user.name;
}
