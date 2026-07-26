"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [employeeCode, setEmployeeCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addDigit(digit: string) {
    setError(null);
    setEmployeeCode((currentCode) =>
      currentCode.length >= 6 ? currentCode : `${currentCode}${digit}`,
    );
  }

  function removeDigit() {
    setError(null);
    setEmployeeCode((currentCode) => currentCode.slice(0, -1));
  }

  function clearCode() {
    setError(null);
    setEmployeeCode("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (employeeCode.length !== 6) {
      setError("Enter your 6-digit employee code.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    const response = await fetch("/api/employee-login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ employeeCode, password }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error ?? "Login failed.");
      return;
    }

    router.push("/staff");
    router.refresh();
  }

  const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <input name="employeeCode" type="hidden" value={employeeCode} />

      <section
        aria-label="Employee code keypad"
        className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4"
      >
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-300">Employee code</p>
          <div className="mt-3 flex justify-center gap-2" aria-live="polite">
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className={`h-4 w-4 rounded-full border ${
                  index < employeeCode.length
                    ? "border-emerald-400 bg-emerald-400"
                    : "border-zinc-600 bg-zinc-950"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {keypadDigits.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => addDigit(digit)}
              className="h-16 rounded-md border border-zinc-700 bg-zinc-950 text-2xl font-semibold text-white hover:border-emerald-500 hover:bg-zinc-900 active:scale-[0.98]"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={clearCode}
            className="h-16 rounded-md border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-300 hover:border-red-400 hover:text-red-200 active:scale-[0.98]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => addDigit("0")}
            className="h-16 rounded-md border border-zinc-700 bg-zinc-950 text-2xl font-semibold text-white hover:border-emerald-500 hover:bg-zinc-900 active:scale-[0.98]"
          >
            0
          </button>
          <button
            type="button"
            onClick={removeDigit}
            className="h-16 rounded-md border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-200 active:scale-[0.98]"
          >
            Back
          </button>
        </div>
      </section>

      <label className="block">
        <span className="text-sm font-medium text-zinc-300">Password</span>
        <input
          name="password"
          type="password"
          required
          className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting || employeeCode.length !== 6}
        className="w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign in to staff tools"}
      </button>
    </form>
  );
}
