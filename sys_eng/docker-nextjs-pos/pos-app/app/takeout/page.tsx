import Link from "next/link";

import { EmberMark } from "@/app/components/ember-mark";
import { SiteFooter } from "@/app/components/site-footer";
import { prisma } from "@/lib/prisma";

import { TakeoutOrderClient } from "./takeout-order-client";

// Standalone takeout ordering page. Unlike /table/[token], this is a private
// customer cart and should later persist into TakeoutSession, not TableSession.
export default async function TakeoutPage() {
  const restaurant = await prisma.restaurantSettings.findUnique({
    where: { id: 1 },
  });
  const locale = restaurant?.defaultLocale ?? "en";
  const menuItems = await prisma.menuItem.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      translations: {
        where: { locale },
      },
    },
  });
  const takeoutMenuItems = menuItems.map((item) => {
    const translation = item.translations[0];

    return {
      id: item.id,
      priceCents: item.priceCents,
      categoryKey: item.categoryKey,
      imageUrl: item.imageUrl,
      name: translation?.name ?? `Menu item #${item.id}`,
      description: translation?.description ?? null,
      category: translation?.category ?? item.categoryKey ?? "Menu",
    };
  });

  return (
    <main className="min-h-screen bg-[#100b0b] text-[#fff7ed]">
      <header className="border-b border-orange-950/60 bg-[#1a0f0b] px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <EmberMark className="h-9 w-9" />
            <span>Ember</span>
          </Link>
          <Link
            href="/menu"
            className="rounded-md border border-orange-200/25 px-3 py-2 text-sm hover:bg-orange-100/10"
          >
            View PDF menu
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffd166]">
          {restaurant?.name ?? "Restaurant"}
        </p>
        <h1 className="mt-3 text-4xl font-bold">Start a takeout order</h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          Build a private takeout cart for pickup. Table QR sessions remain for
          dine-in groups and shared ordering.
        </p>
      </section>

      <TakeoutOrderClient menuItems={takeoutMenuItems} />
      <SiteFooter restaurantName={restaurant?.name} />
    </main>
  );
}
