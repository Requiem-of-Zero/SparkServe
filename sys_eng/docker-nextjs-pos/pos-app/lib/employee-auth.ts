import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Reads the Better Auth session from cookies on server-rendered pages/actions.
export async function getCurrentSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

// Loads the logged-in user's POS employee profile, if they are staff.
export async function getCurrentEmployee() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  return prisma.employeeProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
}

// Protects employee-only pages like the register or kitchen screen.
export async function requireActiveEmployee() {
  const employee = await getCurrentEmployee();

  if (!employee || !employee.active || employee.resignedAt) {
    redirect("/login");
  }

  return employee;
}

// Protects owner-only pages like employee management.
export async function requireOwner() {
  const employee = await requireActiveEmployee();

  if (employee.role !== "OWNER") {
    redirect("/staff");
  }

  return employee;
}
