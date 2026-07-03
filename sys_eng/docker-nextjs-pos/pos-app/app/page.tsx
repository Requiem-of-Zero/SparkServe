import Link from "next/link";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Big Fish House";

const featuredItems = [
  {
    name: "Beef Noodle Soup",
    description: "Slow-braised beef, spring onions, and warm broth.",
    price: "$13.99",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Crispy Dumplings",
    description: "Pan-seared dumplings with house chili crisp.",
    price: "$8.99",
    image:
      "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Milk Tea",
    description: "Cold black tea, milk, and brown sugar.",
    price: "$4.99",
    image:
      "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=80",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <section className="relative min-h-[82vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=80"
          alt="Warm restaurant dining room"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative mx-auto flex min-h-[82vh] max-w-6xl flex-col px-6 py-6">
          <nav className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-xl font-bold">
              {appName}
            </Link>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/customer/login"
                className="rounded-md border border-white/30 px-3 py-2 hover:bg-white/10"
              >
                Member Login
              </Link>
              <Link
                href="/admin/login"
                className="rounded-md border border-white/30 px-3 py-2 hover:bg-white/10"
              >
                Owner
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-white/30 px-3 py-2 hover:bg-white/10"
              >
                Staff
              </Link>
            </div>
          </nav>

          <div className="flex flex-1 items-center">
            <div className="max-w-2xl py-16">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Fresh bowls, fast tables, real rewards
              </p>
              <h1 className="mt-5 text-5xl font-bold leading-tight md:text-7xl">
                Dinner that remembers your favorites.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-zinc-200">
                Order at the table, save loyalty points, and unlock member-only
                menu rewards each time you visit.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/customer/signup"
                  className="rounded-md bg-emerald-400 px-5 py-3 font-semibold text-zinc-950 hover:bg-emerald-300"
                >
                  Join Rewards
                </Link>
                <Link
                  href="#menu"
                  className="rounded-md border border-white/40 px-5 py-3 font-semibold hover:bg-white/10"
                >
                  View Menu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-800 bg-stone-900 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Join once. Start saving today.</h2>
            <p className="mt-2 max-w-2xl text-stone-300">
              Creating an account automatically makes you a loyalty rewards
              member, so paid orders can start building points toward selected
              reward items.
            </p>
          </div>
          <Link
            href="/customer/signup"
            className="inline-flex rounded-md bg-emerald-400 px-5 py-3 font-semibold text-zinc-950 hover:bg-emerald-300"
          >
            Create Member Account
          </Link>
        </div>
      </section>

      <section id="menu" className="px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Featured menu
              </p>
              <h2 className="mt-3 text-3xl font-bold">House favorites</h2>
            </div>
            <Link
              href="/customer/login"
              className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Sign in to view rewards
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {featuredItems.map((item) => (
              <article
                key={item.name}
                className="overflow-hidden rounded-lg border border-stone-800 bg-stone-900"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-52 w-full object-cover"
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    <span className="font-semibold text-emerald-300">
                      {item.price}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-300">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
