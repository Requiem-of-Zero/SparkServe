"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { readBoolean, readRequiredString } from "@/lib/form-data";
import { prisma } from "@/lib/prisma";

// Creates the Better Auth user first, then attaches restaurant-specific
// customer data used for loyalty points, marketing opt-in, and future orders.
export async function customerSignUpAction(formData: FormData) {
  const name = readRequiredString(formData, "name");
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const confirmPassword = readRequiredString(formData, "confirmPassword");
  const marketingOptIn = readBoolean(formData, "marketingOptIn");

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  // Better Auth creates the user and hashed password account.
  // CustomerProfile stores restaurant membership and loyalty data.
  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
    headers: await headers(),
  });

  await prisma.customerProfile.create({
    data: {
      userId: result.user.id,
      displayName: name,
      marketingOptIn,
    },
  });

  redirect("/customer/login?created=1");
}
