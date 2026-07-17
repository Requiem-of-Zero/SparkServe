import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { PosRegister } from "@/app/pos/pos-register";
import { requireActiveEmployee } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";

export default async function PosPage() {
  const [employee, restaurant] = await Promise.all([
    requireActiveEmployee(),
    prisma.restaurantSettings.findUnique({ where: { id: 1 } }),
  ]);
  const restaurantName = restaurant?.name ?? "Restaurant";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">POS register</p>
            <h1 className="text-3xl font-bold">{restaurantName}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Signed in as {employee.user.displayUsername ?? employee.user.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/staff"
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Staff Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>

        <PosRegister />
      </section>
    </main>
  );
}
