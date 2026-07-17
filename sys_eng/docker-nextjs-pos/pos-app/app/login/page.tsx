import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to POS
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Employee Login</h1>
        <p className="mt-2 text-zinc-400">
          Staff use the six-digit employee code provided by the owner.
        </p>

        <LoginForm />

        <p className="mt-6 text-sm text-zinc-500">
          Owners managing employees should use{" "}
          <Link href="/owner/login" className="text-emerald-300 hover:text-emerald-200">
            owner login
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
