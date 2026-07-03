"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function LogoutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
    >
      Sign out
    </button>
  );
}
