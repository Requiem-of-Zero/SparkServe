"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addTableSessionItemAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const menuItemId = Number(formData.get("menuItemId") ?? 0);

  if (token === "" || !Number.isInteger(menuItemId) || menuItemId <= 0) {
    throw new Error("Invalid table session item request.");
  }

  const session = await prisma.tableSession.findUnique({
    where: { publicToken: token },
  });

  if (!session || session.status !== "OPEN") {
    throw new Error("Table session is not open.");
  }

  await prisma.tableSessionItem.create({
    data: {
      tableSessionId: session.id,
      menuItemId,
      quantity: 1,
    },
  });

  revalidatePath(`/table/${token}`);
}
