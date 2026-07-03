"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { generateEmployeeLoginCode } from "@/lib/employee-login-code";
import { requireOwner } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";
import { EmployeeRole } from "@/lib/generated/prisma/enums";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

async function generateUniqueEmployeeCode() {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const code = generateEmployeeLoginCode();
    const existingUser = await prisma.user.findUnique({
      where: { username: code },
    });

    if (!existingUser) {
      return code;
    }
  }

  throw new Error("Could not generate a unique employee code.");
}

async function createAuthUserWithEmployeeProfile({
  name,
  email,
  password,
  confirmPassword,
  role,
}: {
  name: string;
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
  // The username plugin stores our six-digit employee code in User.username.
  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      username: employeeCode,
      displayUsername: employeeCode,
    },
    headers: await headers(),
  });

  await prisma.employeeProfile.create({
    data: {
      userId: result.user.id,
      role,
      hiredAt: new Date(),
    },
  });

  return employeeCode;
}

// One-time setup action for a brand-new restaurant database.
export async function bootstrapOwnerAction(formData: FormData) {
  const existingOwner = await prisma.employeeProfile.findFirst({
    where: { role: "OWNER" },
  });

  if (existingOwner) {
    redirect("/admin/employees");
  }

  const code = await createAuthUserWithEmployeeProfile({
    name: readRequiredString(formData, "name"),
    email: readRequiredString(formData, "email"),
    password: readRequiredString(formData, "password"),
    confirmPassword: readRequiredString(formData, "confirmPassword"),
    role: "OWNER",
  });

  redirect(`/admin/employees?created=${code}&role=OWNER`);
}

// Owner-only action for creating staff accounts.
export async function createEmployeeAction(formData: FormData) {
  await requireOwner();

  const roleValue = readRequiredString(formData, "role");
  const role = roleValue === "MANAGER" ? EmployeeRole.MANAGER : EmployeeRole.CASHIER;

  const code = await createAuthUserWithEmployeeProfile({
    name: readRequiredString(formData, "name"),
    email: readRequiredString(formData, "email"),
    password: readRequiredString(formData, "password"),
    confirmPassword: readRequiredString(formData, "confirmPassword"),
    role,
  });

  redirect(`/admin/employees?created=${code}&role=${role}`);
}
