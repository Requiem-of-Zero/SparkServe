import { getTableSessionByToken } from "@/lib/table-sessions";
import { prisma } from "@/lib/prisma";
import { addTableSessionItemAction } from "./actions";
import { TableLiveClient } from "./table-live-client";

type TableSessionPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function TableSessionPage({
  params,
}: TableSessionPageProps) {
  const { token } = await params;
  const session = await getTableSessionByToken(token);

  const menuItems = await prisma.menuItem.findMany({
    where: {
      active: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
    include: {
      translations: {
        where: {
          locale: "en",
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">
          Table{" "}
          {session.table.label ?? `${session.table.row}${session.table.col}`}
        </h1>

        <p className="mt-2 text-zinc-400">Session status: {session.status}</p>
        <TableLiveClient token={token} />
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-xl font-semibold">Shared cart</h2>

          {session.items.length === 0 ? (
            <p className="mt-3 text-zinc-400">No items added yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {session.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}x menu item #{item.menuItemId}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-semibold">Menu</h2>

        <div className="mt-4 grid gap-3">
          {menuItems.map((item) => {
            const translation = item.translations[0];

            return (
              <div
                key={item.id}
                className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {translation?.name ?? `Menu item #${item.id}`}
                    </h3>

                    {translation?.description ? (
                      <p className="mt-1 text-sm text-zinc-400">
                        {translation.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-zinc-500">
                      {translation?.category ?? item.categoryKey ?? "Menu"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      ${(item.priceCents / 100).toFixed(2)}
                    </p>

                    <form action={addTableSessionItemAction}>
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="menuItemId" value={item.id} />

                      <button
                        type="submit"
                        className="mt-3 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
