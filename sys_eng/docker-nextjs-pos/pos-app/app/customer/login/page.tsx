import Link from "next/link";

import { SocialLoginButtons } from "@/app/customer/components/social-login-buttons";
import { CustomerLoginForm } from "@/app/customer/login/customer-login-form";
import { customerSocialProviders } from "@/lib/social-providers";

type CustomerLoginPageProps = {
  searchParams?: Promise<{
    created?: string;
  }>;
};

export default async function CustomerLoginPage({
  searchParams,
}: CustomerLoginPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to menu
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Member Login</h1>
        <p className="mt-2 text-zinc-400">
          Sign in to view loyalty points and future rewards.
        </p>

        {params?.created ? (
          <p className="mt-6 rounded-md border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-200">
            Account created. Sign in to continue.
          </p>
        ) : null}

        <SocialLoginButtons providers={customerSocialProviders} />
        <CustomerLoginForm />

        <p className="mt-6 text-sm text-zinc-500">
          New here?{" "}
          <Link
            href="/customer/signup"
            className="text-emerald-300 hover:text-emerald-200"
          >
            Create a member account
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
