import Link from "next/link";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

function getTableLabel(table: { row: string; col: number; label: string | null }) {
  return table.label ?? `${table.row}${table.col}`;
}

export default async function DevTableQrPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  const sessions = await prisma.tableSession.findMany({
    where: {
      publicToken: {
        startsWith: "dev-",
      },
      status: "OPEN",
    },
    include: {
      table: true,
    },
    orderBy: [{ table: { row: "asc" } }, { table: { col: "asc" } }],
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to home
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold">Demo Table QR Codes</h1>
          <p className="mt-2 text-zinc-400">
            Open this page from your LAN URL so QR codes point at the reachable
            host, for example http://192.168.1.58:3000/dev/table-qr.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sessions.map((session) => {
            const tableUrl = `${baseUrl}/table/${session.publicToken}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tableUrl)}`;

            return (
              <article
                key={session.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <h2 className="text-xl font-semibold">
                  {getTableLabel(session.table)}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {session.publicToken}
                </p>

                <img
                  src={qrUrl}
                  alt={`QR code for ${getTableLabel(session.table)}`}
                  className="mt-4 aspect-square w-full rounded-md bg-white p-3"
                />

                <a
                  href={tableUrl}
                  className="mt-4 block break-all text-sm text-emerald-300 hover:text-emerald-200"
                >
                  {tableUrl}
                </a>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
