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
  const displayName = restaurantName ?? "Restaurant";

  return (
    <footer className="border-t border-orange-950/60 bg-[#0b0707] px-5 py-10 text-[#fff7ed]">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_2fr]">
          <div>
            <Link href="/" className="text-xl font-bold">
              {displayName}
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
              Order online, join rewards, and manage takeout or table sessions
              with {displayName}.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd166]/80"
            >
              <AblazeMark className="h-6 w-6" />
              Powered by Ablaze
            </Link>
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
            © {year} {displayName}. All rights reserved.
          </p>
          <p className="text-zinc-600">Ablaze restaurant ordering platform.</p>
        </div>
      </div>
    </footer>
  );
}
