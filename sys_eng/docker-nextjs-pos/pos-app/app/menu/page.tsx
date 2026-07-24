import Link from "next/link";

import { MenuPreviewGrid } from "@/app/components/menu-preview-grid";
import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { SiteFooter } from "@/app/components/site-footer";
import { prisma } from "@/lib/prisma";

// Public restaurant menu viewer. For now this uses a demo PDF asset; later the
// owner settings panel can store each restaurant's uploaded PDF URL.
export default async function MenuPage() {
  const restaurant = await prisma.restaurantSettings.findUnique({
    where: { id: 1 },
  });
  const restaurantName = restaurant?.name ?? "Restaurant";
  const menuItems = await prisma.menuItem.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
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

  return (
    <main className="min-h-screen bg-[#100b0b] px-5 py-5 text-[#fff7ed]">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between gap-3">
          <RestaurantBrandLink
            logoUrl={restaurant?.logoUrl}
            name={restaurantName}
          />
          <Link
            href="/takeout"
            className="rounded-md bg-[#ff6a1a] px-3 py-2 text-sm font-semibold text-[#160b08] hover:bg-[#ffd166]"
          >
            Start takeout order
          </Link>
        </nav>

        <section className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffd166]">
            {restaurant?.name ?? "Restaurant"}
          </p>
          <h1 className="mt-3 text-4xl font-bold">Menu</h1>
          <p className="mt-3 text-zinc-300">
            View the restaurant menu as a PDF, then start a takeout order when
            you are ready.
          </p>
        </section>

        <div className="mt-6 overflow-hidden rounded-lg border border-orange-950/60 bg-[#1a0f0b]">
          <object
            data="/menu/sparkserve-demo-menu.pdf"
            type="application/pdf"
            className="h-[76vh] w-full"
          >
            <div className="p-5">
              <p className="text-zinc-300">
                Your browser could not display the PDF inline.
              </p>
              <a
                href="/menu/sparkserve-demo-menu.pdf"
                className="mt-3 inline-flex rounded-md border border-orange-200/25 px-3 py-2 text-sm text-[#ffd166]"
              >
                Open PDF menu
              </a>
            </div>
          </object>
        </div>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffd166]">
                Item details
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                Tap a dish for ingredients
              </h2>
            </div>
            <Link
              href="/takeout"
              className="hidden rounded-md bg-[#ff6a1a] px-4 py-2 text-sm font-semibold text-[#160b08] hover:bg-[#ffd166] sm:inline-flex"
            >
              Start order
            </Link>
          </div>
          <div className="mt-6">
            <MenuPreviewGrid menuItems={previewMenuItems} />
          </div>
        </section>
      </div>

      <SiteFooter restaurantName={restaurantName} />
    </main>
  );
}
