"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/app/components/logout-button";
import { useTableIdentity } from "./table-identity-context";

// Shows whether the table is currently ordering as a guest participant or a
// signed-in loyalty member. The owner badge comes from table participant state.
export function TableLoginBar() {
  const pathname = usePathname();
  const { displayName, participantRole, setDisplayName, isSignedIn } =
    useTableIdentity();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(displayName);

  function saveDisplayName() {
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      return;
    }

    setDisplayName(trimmedName.slice(0, 30));
    setIsEditing(false);
  }

  const loginHref = `/customer/login?returnTo=${encodeURIComponent(pathname)}`;
  const signupHref = `/customer/signup?returnTo=${encodeURIComponent(pathname)}`;

  return (
    <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Ordering as
          </p>
          {isEditing ? (
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={30}
                className="min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={saveDisplayName}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftName(displayName);
                  setIsEditing(false);
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-semibold text-white">{displayName}</p>
              {participantRole ? (
                <span className="rounded border border-zinc-700 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-300">
                  {participantRole === "OWNER" ? "Session owner" : "Guest"}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm text-emerald-300 hover:text-emerald-200"
              >
                Change name
              </button>
            </div>
          )}
          <p className="text-sm text-zinc-400">
            {isSignedIn
              ? "Loyalty rewards can be connected to this order later."
              : "Log in to save rewards and member history."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isSignedIn ? (
            <>
              <Link
                href="/customer/account"
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Account
              </Link>
              <LogoutButton redirectTo={pathname} />
            </>
          ) : (
            <>
              <Link
                href={loginHref}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                Member login
              </Link>
              <Link
                href={signupHref}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Join rewards
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
