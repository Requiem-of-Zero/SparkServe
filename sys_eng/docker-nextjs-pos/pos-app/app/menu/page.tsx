import Link from "next/link";

import { EmberMark } from "@/app/components/ember-mark";
import { SiteFooter } from "@/app/components/site-footer";
import { prisma } from "@/lib/prisma";

// Public restaurant menu viewer. For now this uses a demo PDF asset; later the
// restaurant settings/admin panel can store each restaurant's uploaded PDF URL.
export default async function MenuPage() {
  const restaurant = await prisma.restaurantSettings.findUnique({
    where: { id: 1 },
  });

  return (
    <main className="min-h-screen bg-[#100b0b] px-5 py-5 text-[#fff7ed]">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <EmberMark className="h-9 w-9" />
            <span>Ember</span>
          </Link>
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
            data="/menu/ember-demo-menu.pdf"
            type="application/pdf"
            className="h-[76vh] w-full"
          >
            <div className="p-5">
              <p className="text-zinc-300">
                Your browser could not display the PDF inline.
              </p>
              <a
                href="/menu/ember-demo-menu.pdf"
                className="mt-3 inline-flex rounded-md border border-orange-200/25 px-3 py-2 text-sm text-[#ffd166]"
              >
                Open PDF menu
              </a>
            </div>
          </object>
        </div>
      </div>

      <SiteFooter restaurantName={restaurant?.name} />
    </main>
  );
}
