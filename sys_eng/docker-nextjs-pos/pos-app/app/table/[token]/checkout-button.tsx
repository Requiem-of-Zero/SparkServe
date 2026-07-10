"use client";

import { useState } from "react";

type CheckoutResponse = {
  message?: string;
  url?: string;
};

// Starts Stripe Checkout for all unpaid kitchen orders in this table session.
export function CheckoutButton({ token }: { token: string }) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/table/${token}/checkout/stripe-session`, {
        method: "POST",
      });
      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || !data.url) {
        throw new Error(data.message ?? "Could not start checkout.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start checkout.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={isStarting}
        className="w-full rounded-md bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isStarting ? "Opening checkout..." : "Checkout with card"}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
