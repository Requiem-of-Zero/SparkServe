import Link from "next/link";

import { AblazeMark } from "./ablaze-mark";

type SiteFooterProps = {
  restaurantName?: string | null;
};

const footerColumns = [
  {
    heading: "Restaurant",
    links: [
      { href: "/menu", label: "Menu" },
      { href: "/takeout", label: "Takeout ordering" },
      { href: "/customer/signup", label: "Rewards" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/", label: "About us" },
      { href: "/", label: "Our mission" },
      { href: "/", label: "About the application" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/customer/login", label: "Member login" },
      { href: "/owner/login", label: "Owner portal" },
      { href: "/", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/", label: "Privacy" },
      { href: "/", label: "Terms" },
      { href: "/", label: "Accessibility" },
    ],
  },
];

// Public-facing footer for restaurant storefront pages. Placeholder company
// links route home until the content pages are ready.
export function SiteFooter({ restaurantName }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-orange-950/60 bg-[#0b0707] px-5 py-10 text-[#fff7ed]">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 font-bold">
              <AblazeMark className="h-10 w-10" />
              <span>Ablaze</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
              {restaurantName ?? "This restaurant"} uses Ablaze for online
              ordering, table sessions, takeout carts, and member rewards.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#ffd166]">
              Powered by Ablaze
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.heading}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffd166]">
                  {column.heading}
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="hover:text-[#fff7ed]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-orange-950/50 pt-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {restaurantName ?? "Restaurant"}. All rights reserved.
          </p>
          <p>Ablaze restaurant ordering platform.</p>
        </div>
      </div>
    </footer>
  );
}
