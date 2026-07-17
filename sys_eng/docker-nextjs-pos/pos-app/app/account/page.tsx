import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";

// Smart account landing page used after generic auth callbacks.
// Employees belong in staff tools by default; customers land in rewards/account.
export default async function AccountRouterPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/customer/login");
  }

  const employee = await prisma.employeeProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, active: true, resignedAt: true },
  });

  if (employee?.active && !employee.resignedAt) {
    redirect("/staff");
  }

  redirect("/customer/account");
}
