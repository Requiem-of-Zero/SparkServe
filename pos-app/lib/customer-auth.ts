import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";

// Loads the logged-in user's customer/member profile, if one exists.
export async function getCurrentCustomer() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  return prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
}

// Protects customer portal pages like loyalty points and order history.
export async function requireCustomer() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/customer/login");
  }

  const customer = await prisma.customerProfile.upsert({
    where: { userId: session.user.id },
    update: {},
    create: {
      userId: session.user.id,
      displayName: session.user.name,
    },
    include: { user: true },
  });

  return customer;
}
