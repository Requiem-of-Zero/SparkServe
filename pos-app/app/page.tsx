import Link from "next/link";

import { MenuPreviewGrid } from "@/app/components/menu-preview-grid";
import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { SiteFooter } from "@/app/components/site-footer";
import { getCurrentSession } from "@/lib/employee-auth";
import { prisma } from "@/lib/prisma";

// Customer storefront for the restaurant using SparkServe. Takeout has its own
// private cart flow, while dine-in ordering still uses table-session QR links.
export default async function Home() {
  const session = await getCurrentSession();
  const restaurant = await prisma.restaurantSettings.findUnique({
    where: { id: 1 },
  });
  const menuItems = await prisma.menuItem.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
    include: {
      translations: {
        where: { locale: restaurant?.defaultLocale ?? "en" },
      },
      ingredients: {
        orderBy: [{ sortOrder: "asc" }, { ingredient: { name: "asc" } }],
        include: { ingredient: true },
      },
    },
  });
  const previewMenuItems = menuItems.map((item) => {
    const translation = item.translations[0];

    return {
      id: item.id,
      priceCents: item.priceCents,
      categoryKey: item.categoryKey,
      imageUrl: item.imageUrl,
      spicy: item.spicy,
      name: translation?.name ?? `Menu item #${item.id}`,
      description: translation?.description ?? null,
      category: translation?.category ?? item.categoryKey ?? "Menu",
      ingredients: item.ingredients.map((entry) => ({
        id: entry.ingredient.id,
        name: entry.ingredient.name,
        commonAllergen: entry.ingredient.commonAllergen,
        allergenNote: entry.ingredient.allergenNote,
        removable: entry.removable,
      })),
    };
  });
  const [customerProfile, employeeProfile] = session?.user
    ? await Promise.all([
        prisma.customerProfile.findUnique({
          where: { userId: session.user.id },
        }),
        prisma.employeeProfile.findUnique({
          where: { userId: session.user.id },
        }),
      ])
    : [null, null];
  const restaurantName = restaurant?.name ?? "Big Fish House";
  const displayName =
    customerProfile?.displayName ??
    session?.user.displayUsername ??
    session?.user.name ??
    session?.user.email;
  const isLoggedIn = Boolean(session?.user);
  const accountHref = employeeProfile ? "/staff" : "/customer/account";

  return (
    <main className="min-h-screen bg-[#100b0b] text-[#fff7ed]">
      <section className="relative overflow-hidden border-b border-orange-950/60">
        <img
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#100b0b]/45 via-[#100b0b]/80 to-[#100b0b]" />

        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col px-5 py-5">
          <nav className="flex items-center justify-between gap-3">
            <RestaurantBrandLink
              logoUrl={restaurant?.logoUrl}
              name={restaurantName}
              animated
              markClassName="h-12 w-12"
              textClassName="text-xl"
            />
            <div className="flex gap-2 text-sm">
              {isLoggedIn ? (
                <>
                  <Link
                    href={accountHref}
                    className="rounded-md border border-orange-200/25 px-3 py-2 hover:bg-orange-100/10"
                  >
                    {displayName}
                  </Link>
                  {employeeProfile?.role === "OWNER" ? (
                    <Link
                      href="/owner/employees"
                      className="rounded-md border border-orange-200/25 px-3 py-2 hover:bg-orange-100/10"
                    >
                      Owner
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link
                    href="/customer/login"
                    className="rounded-md border border-orange-200/25 px-3 py-2 hover:bg-orange-100/10"
                  >
                    Member
                  </Link>
                  <Link
                    href="/owner/login"
                    className="rounded-md border border-orange-200/25 px-3 py-2 hover:bg-orange-100/10"
                  >
                    Owner
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="flex flex-1 items-end pb-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffd166]">
                {restaurantName}
              </p>
              <h1 className="mt-4 text-5xl font-bold leading-tight md:text-7xl">
                Order fresh favorites from {restaurantName}.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-zinc-200">
                Browse the menu, build a takeout cart, and check out with card.
                Members can sign in for rewards while guests can order fast.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/takeout"
                  className="rounded-md bg-[#ff6a1a] px-5 py-3 font-semibold text-[#160b08] shadow-[0_0_28px_rgba(255,106,26,0.3)] hover:bg-[#ffd166]"
                >
                  Start takeout order
                </Link>
                <Link
                  href="/menu"
                  className="rounded-md border border-orange-200/35 px-5 py-3 font-semibold hover:bg-orange-100/10"
                >
                  View menu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-orange-950/60 bg-[#1a0f0b] px-5 py-7">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isLoggedIn ? "Your rewards are ready." : "Rewards are built in."}
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-300">
              {isLoggedIn
                ? `Welcome back${displayName ? `, ${displayName}` : ""}. ${restaurantName} can connect paid orders to loyalty points, member history, and restaurant rewards.`
                : `Create an account once and ${restaurantName} can connect future paid orders to loyalty points, member history, and restaurant rewards.`}
            </p>
            {customerProfile ? (
              <p className="mt-3 text-sm font-semibold text-[#ffd166]">
                Current points: {customerProfile.loyaltyPointsBalance}
              </p>
            ) : null}
          </div>
          <Link
            href={
              isLoggedIn
                ? employeeProfile
                  ? "/staff"
                  : "/customer/account"
                : "/customer/signup"
            }
            className="inline-flex rounded-md border border-[#ffd166] px-5 py-3 font-semibold text-[#ffd166] hover:bg-[#2a150d]"
          >
            {isLoggedIn
              ? employeeProfile
                ? "Open staff tools"
                : "View rewards"
              : "Join rewards"}
          </Link>
        </div>
      </section>

      <section id="menu" className="px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffd166]">
                Menu
              </p>
              <h2 className="mt-3 text-3xl font-bold">Order favorites</h2>
            </div>
            <Link
              href="/takeout"
              className="hidden rounded-md bg-[#ff6a1a] px-4 py-2 text-sm font-semibold text-[#160b08] hover:bg-[#ffd166] sm:inline-flex"
            >
              Start order
            </Link>
          </div>

          <div className="mt-7">
            <MenuPreviewGrid menuItems={previewMenuItems} />
          </div>

          <Link
            href="/takeout"
            className="mt-6 flex w-full justify-center rounded-md bg-[#ff6a1a] px-5 py-3 font-semibold text-[#160b08] hover:bg-[#ffd166] sm:hidden"
          >
            Start takeout order
          </Link>
        </div>
      </section>

      <SiteFooter restaurantName={restaurantName} />
    </main>
  );
}
