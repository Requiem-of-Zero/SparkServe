import Link from "next/link";

import { AdminLoginForm } from "@/app/admin/login/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to POS
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Owner Login</h1>
        <p className="mt-2 text-zinc-400">
          Owners use email and password for the admin panel.
        </p>

        <AdminLoginForm />

        <p className="mt-6 text-sm text-zinc-500">
          Employee iPad/register login uses the six-digit staff code at{" "}
          <Link href="/login" className="text-emerald-300 hover:text-emerald-200">
            employee login
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
