"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireOwner } from "@/lib/employee-auth";
import { EmployeeRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function generateEmployeeLoginCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

async function generateUniqueEmployeeCode() {
  // Codes are short for staff convenience, so check for collisions before saving.
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const code = generateEmployeeLoginCode();
    const existingEmployee = await prisma.employeeProfile.findUnique({
      where: { loginCode: code },
    });

    if (!existingEmployee) {
      return code;
    }
  }

  throw new Error("Could not generate a unique employee code.");
}

async function createAuthUserWithEmployeeProfile({
  name,
  displayName,
  email,
  password,
  confirmPassword,
  role,
}: {
  name: string;
  displayName: string | null;
  email: string;
  password: string;
  confirmPassword: string;
  role: EmployeeRole;
}) {
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const employeeCode = await generateUniqueEmployeeCode();

  // Better Auth creates the user plus hashed password account.
  // The private staff code is stored on EmployeeProfile.loginCode below.
  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      displayUsername: displayName ?? name,
    },
    headers: await headers(),
  });

  await prisma.employeeProfile.create({
    data: {
      userId: result.user.id,
      loginCode: employeeCode,
      role,
      hiredAt: new Date(),
    },
  });

  return employeeCode;
}

// One-time setup action for a brand-new restaurant database.
// After this exists, every staff-management route requires an owner session.
export async function bootstrapOwnerAction(formData: FormData) {
  const existingOwner = await prisma.employeeProfile.findFirst({
    where: { role: "OWNER" },
  });

  if (existingOwner) {
    redirect("/admin/employees");
  }

  const code = await createAuthUserWithEmployeeProfile({
    name: readRequiredString(formData, "name"),
    displayName: readOptionalString(formData, "displayName"),
    email: readRequiredString(formData, "email"),
    password: readRequiredString(formData, "password"),
    confirmPassword: readRequiredString(formData, "confirmPassword"),
    role: "OWNER",
  });

  redirect(`/admin/employees?created=${code}&role=OWNER`);
}

// Owner-only action for creating staff accounts.
// Owners distribute the generated code, but staff-facing screens show displayName.
export async function createEmployeeAction(formData: FormData) {
  await requireOwner();

  const roleValue = readRequiredString(formData, "role");
  const role =
    roleValue === "MANAGER" ? EmployeeRole.MANAGER : EmployeeRole.CASHIER;

  const code = await createAuthUserWithEmployeeProfile({
    name: readRequiredString(formData, "name"),
    displayName: readOptionalString(formData, "displayName"),
    email: readRequiredString(formData, "email"),
    password: readRequiredString(formData, "password"),
    confirmPassword: readRequiredString(formData, "confirmPassword"),
    role,
  });

  redirect(`/admin/employees?created=${code}&role=${role}`);
}

function readEmployeeIds(formData: FormData) {
  return formData
    .getAll("employeeIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

async function rotateEmployeeCodes(employeeIds: number[]) {
  let rotated = 0;

  for (const employeeId of employeeIds) {
    const loginCode = await generateUniqueEmployeeCode();

    await prisma.employeeProfile.update({
      where: { id: employeeId },
      data: { loginCode },
    });

    rotated += 1;
  }

  return rotated;
}

// Owner-only action for rotating selected private employee login codes.
export async function rotateSelectedEmployeeCodesAction(formData: FormData) {
  await requireOwner();

  const employeeIds = readEmployeeIds(formData);

  if (employeeIds.length === 0) {
    redirect("/admin/employees?rotated=0");
  }

  const rotated = await rotateEmployeeCodes(employeeIds);

  redirect(`/admin/employees?rotated=${rotated}`);
}

// Owner-only action for rotating every employee login code in one sweep.
export async function rotateAllEmployeeCodesAction() {
  await requireOwner();

  const employees = await prisma.employeeProfile.findMany({
    select: { id: true },
  });
  const rotated = await rotateEmployeeCodes(
    employees.map((employee) => employee.id),
  );

  redirect(`/admin/employees?rotated=${rotated}`);
}
