import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { requireCustomer } from "@/lib/customer-auth";
import { getCurrentEmployee } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";

export default async function CustomerAccountPage() {
  const [customer, employee, restaurant] = await Promise.all([
    requireCustomer(),
    getCurrentEmployee(),
    prisma.restaurantSettings.findUnique({ where: { id: 1 } }),
  ]);
  const restaurantName = restaurant?.name ?? "Restaurant";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <RestaurantBrandLink
              logoUrl={restaurant?.logoUrl}
              name={restaurantName}
              markClassName="h-9 w-9"
            />
            <p className="text-sm text-zinc-400">Member account</p>
            <h1 className="text-3xl font-bold">
              {customer.displayName ?? customer.user.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {employee ? (
              <Link
                href="/staff"
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Staff dashboard
              </Link>
            ) : null}
            <LogoutButton redirectTo="/customer/login" />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Email</p>
            <p className="mt-1 font-medium">{customer.user.email}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Loyalty points</p>
            <p className="mt-1 text-3xl font-semibold">
              {customer.loyaltyPointsBalance}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Rewards updates</p>
            <p className="mt-1 font-medium">
              {customer.marketingOptIn ? "Opted in" : "Not opted in"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-xl font-semibold">Rewards</h2>
          <p className="mt-2 text-zinc-400">
            Reward items will appear here once the owner configures loyalty.
          </p>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400"
        >
          Back to menu
        </Link>
      </section>
    </main>
  );
}
