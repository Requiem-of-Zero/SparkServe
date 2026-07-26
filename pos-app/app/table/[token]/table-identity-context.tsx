"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type TableIdentityContextValue = {
  displayName: string;
  accountDisplayName?: string;
  setDisplayName: (name: string) => void;
  participantPublicId?: string;
  participantRole?: string;
  canOrder: boolean;
  setParticipantIdentity: (identity: {
    participantPublicId: string;
    displayName: string;
    participantRole?: string;
  }) => void;
  isSignedIn: boolean;
  isReady: boolean;
};

const TableIdentityContext = createContext<TableIdentityContextValue | null>(
  null,
);

// Holds the current table participant identity for all client components on the
// ordering page. The participant public id is separate from the signed-in user.
export function TableIdentityProvider({
  initialDisplayName,
  accountDisplayName,
  initialCanOrder,
  isSignedIn,
  storageKey,
  fallbackStorageKey,
  children,
}: {
  initialDisplayName?: string;
  accountDisplayName?: string;
  initialCanOrder: boolean;
  isSignedIn: boolean;
  storageKey: string;
  fallbackStorageKey?: string;
  children: ReactNode;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName || "Guest");
  const [participantPublicId, setParticipantPublicId] = useState<
    string | undefined
  >();
  const [participantRole, setParticipantRole] = useState<string | undefined>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      // Local storage preserves the table participant for this browser/device.
      // When signed in, we may reuse the guest owner public id as a fallback.
      const savedDisplayName = window.localStorage.getItem(storageKey);
      const savedParticipantPublicId = window.localStorage.getItem(
        `${storageKey}:participantPublicId`,
      );
      const savedParticipantRole = window.localStorage.getItem(
        `${storageKey}:participantRole`,
      );
      const fallbackParticipantPublicId = fallbackStorageKey
        ? window.localStorage.getItem(`${fallbackStorageKey}:participantPublicId`)
        : null;
      const fallbackParticipantRole = fallbackStorageKey
        ? window.localStorage.getItem(`${fallbackStorageKey}:participantRole`)
        : null;
      const shouldUseFallbackParticipant =
        isSignedIn &&
        fallbackParticipantPublicId &&
        fallbackParticipantRole === "OWNER";

      if (savedDisplayName && !isSignedIn) {
        setDisplayName(savedDisplayName);
      }

      if (savedParticipantPublicId || fallbackParticipantPublicId) {
        setParticipantPublicId(
          shouldUseFallbackParticipant
            ? fallbackParticipantPublicId
            : savedParticipantPublicId ?? fallbackParticipantPublicId ?? undefined,
        );
      }

      if (savedParticipantRole || fallbackParticipantRole) {
        setParticipantRole(
          shouldUseFallbackParticipant
            ? fallbackParticipantRole
            : savedParticipantRole ?? fallbackParticipantRole ?? undefined,
        );
      }

      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fallbackStorageKey, isSignedIn, storageKey]);

  const updateDisplayName = useCallback(
    (name: string) => {
      setDisplayName(name);

      if (!isSignedIn) {
        window.localStorage.setItem(storageKey, name);
      }
    },
    [isSignedIn, storageKey],
  );

  const updateParticipantIdentity = useCallback(
    ({
      participantPublicId,
      displayName,
      participantRole,
    }: {
      participantPublicId: string;
      displayName: string;
      participantRole?: string;
    }) => {
      // Signed-in members display their account name, but still keep the same
      // table participant public id for order ownership.
      const nextDisplayName = isSignedIn
        ? accountDisplayName ?? displayName
        : displayName;

      setParticipantPublicId(participantPublicId);
      setParticipantRole(participantRole);
      setDisplayName(nextDisplayName);

      if (!isSignedIn) {
        window.localStorage.setItem(storageKey, displayName);
      }

      window.localStorage.setItem(
        `${storageKey}:participantPublicId`,
        participantPublicId,
      );

      if (participantRole) {
        window.localStorage.setItem(`${storageKey}:participantRole`, participantRole);
      }
    },
    [accountDisplayName, isSignedIn, storageKey],
  );

  const value = useMemo(
    () => ({
      displayName,
      accountDisplayName,
      setDisplayName: updateDisplayName,
      participantPublicId,
      participantRole,
      canOrder: initialCanOrder,
      setParticipantIdentity: updateParticipantIdentity,
      isSignedIn,
      isReady,
    }),
    [
      displayName,
      accountDisplayName,
      isReady,
      isSignedIn,
      initialCanOrder,
      participantPublicId,
      participantRole,
      updateDisplayName,
      updateParticipantIdentity,
    ],
  );

  return (
    <TableIdentityContext.Provider value={value}>
      {children}
    </TableIdentityContext.Provider>
  );
}

export function useTableIdentity() {
  const context = useContext(TableIdentityContext);

  if (!context) {
    throw new Error("useTableIdentity must be used inside TableIdentityProvider.");
  }

  return context;
}
