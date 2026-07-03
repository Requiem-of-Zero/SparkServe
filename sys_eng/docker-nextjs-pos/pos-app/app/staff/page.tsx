import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { requireActiveEmployee } from "@/lib/employee-auth";

export default async function StaffPage() {
  const employee = await requireActiveEmployee();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Signed in as</p>
            <h1 className="text-3xl font-bold">{employee.user.name}</h1>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Employee code</p>
            <p className="mt-1 text-2xl font-semibold">
              {employee.user.username}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Role</p>
            <p className="mt-1 text-2xl font-semibold">{employee.role}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Hired</p>
            <p className="mt-1 text-2xl font-semibold">
              {employee.hiredAt.toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href="/"
            className="rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Open POS
          </Link>
          {employee.role === "OWNER" ? (
            <Link
              href="/admin/employees"
              className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-200 hover:bg-zinc-800"
            >
              Manage Employees
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
