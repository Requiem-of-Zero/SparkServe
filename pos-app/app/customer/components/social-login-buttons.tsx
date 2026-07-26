"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import type { CustomerSocialProvider } from "@/lib/social-providers";

export function SocialLoginButtons({
  providers,
  callbackURL,
}: {
  providers: CustomerSocialProvider[];
  callbackURL: string;
}) {
  // Tracks the provider that is redirecting so users cannot double-submit.
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  if (providers.length === 0) {
    return null;
  }

  async function handleSocialLogin(provider: CustomerSocialProvider) {
    setActiveProvider(provider.id);

    // Better Auth redirects to the provider and then back through /api/auth/*.
    await authClient.signIn.social({
      provider: provider.id,
      callbackURL,
      errorCallbackURL: "/customer/login",
    });

    setActiveProvider(null);
  }

  return (
    <div className="mt-8 space-y-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleSocialLogin(provider)}
          disabled={activeProvider !== null}
          className="w-full rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {activeProvider === provider.id ? "Redirecting..." : provider.label}
        </button>
      ))}

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-500">
        <span className="h-px flex-1 bg-zinc-800" />
        <span>or</span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>
    </div>
  );
}
