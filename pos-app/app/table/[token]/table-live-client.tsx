"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTableIdentity } from "./table-identity-context";
import { tableSocket } from "./table-socket";

// Connects the table page to the realtime server and keeps server-rendered data
// fresh whenever another guest changes the shared cart or ownership state.
export function TableLiveClient({ token }: { token: string }) {
  const router = useRouter();
  const {
    accountDisplayName,
    displayName,
    isReady,
    isSignedIn,
    participantPublicId,
    participantRole,
    setParticipantIdentity,
  } = useTableIdentity();
  const [status, setStatus] = useState("Connecting...");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !displayName) {
      return;
    }

    function handleConnect() {
      setStatus("Connected");
      // The join payload reconciles this browser's participant public id with
      // the optional signed-in loyalty account.
      tableSocket.emit("table:join", {
        token,
        guestName: displayName,
        accountDisplayName,
        isGuest: !isSignedIn && !participantPublicId,
        participantPublicId,
      });
    }

    function handleJoined({
      room,
      guestName,
      participantPublicId,
      participantRole,
    }: {
      room: string;
      guestName?: string;
      participantPublicId?: string;
      participantRole?: string;
    }) {
      // The server is the source of truth for participant id, role, and display.
      if (guestName && participantPublicId) {
        setParticipantIdentity({
          displayName: guestName,
          participantPublicId,
          participantRole,
        });
      }

      setStatus(`Joined ${room}`);
    }

    function handleDisconnect() {
      setStatus("Disconnected");
    }

    function handleItemAdded({
      name,
      quantity,
      guestName: addedBy,
    }: {
      name: string;
      quantity: number;
      guestName?: string;
    }) {
      const prefix = addedBy ? `${addedBy} added` : "Added";

      setNotice(`${prefix} ${quantity}x ${name}`);
      router.refresh();
    }

    function handleItemRemoved({
      name,
      guestName: removedBy,
    }: {
      name: string;
      guestName?: string;
    }) {
      const prefix = removedBy ? `${removedBy} removed` : "Removed";

      setNotice(`${prefix} ${name}`);
      router.refresh();
    }

    function handleItemUpdated({
      name,
      quantity,
      guestName: updatedBy,
    }: {
      name: string;
      quantity: number;
      guestName?: string;
    }) {
      const prefix = updatedBy ? `${updatedBy} updated` : "Updated";

      setNotice(`${prefix} ${name} to ${quantity}`);
      router.refresh();
    }

    function handleCartError({ message }: { message: string }) {
      setNotice(message);
    }

    function handleParticipantJoined({ guestName }: { guestName?: string }) {
      setNotice(`${guestName ?? "Someone"} joined this table.`);
      router.refresh();
    }

    function handleOwnerVerified() {
      setNotice("Table owner confirmed the session. Ordering is open.");
      router.refresh();
    }

    function handleOwnerClaimed() {
      setNotice("A table owner claimed this session.");
      router.refresh();
    }

    function handleOwnershipTransferRequested() {
      setNotice("Ownership transfer request updated.");
      router.refresh();
    }

    function handleOwnershipTransferResponded() {
      setNotice("Table ownership changed.");
      router.refresh();
    }

    tableSocket.on("connect", handleConnect);
    tableSocket.on("table:joined", handleJoined);
    tableSocket.on("table:participant-joined", handleParticipantJoined);
    tableSocket.on("table:owner-claimed", handleOwnerClaimed);
    tableSocket.on("table:owner-verified", handleOwnerVerified);
    tableSocket.on(
      "table:ownership-transfer-requested",
      handleOwnershipTransferRequested,
    );
    tableSocket.on(
      "table:ownership-transfer-responded",
      handleOwnershipTransferResponded,
    );
    tableSocket.on("disconnect", handleDisconnect);
    tableSocket.on("cart:item-added", handleItemAdded);
    tableSocket.on("cart:item-updated", handleItemUpdated);
    tableSocket.on("cart:item-removed", handleItemRemoved);
    tableSocket.on("cart:error", handleCartError);

    if (!tableSocket.connected) {
      tableSocket.connect();
    } else {
      handleConnect();
    }

    return () => {
      tableSocket.off("connect", handleConnect);
      tableSocket.off("table:joined", handleJoined);
      tableSocket.off("table:participant-joined", handleParticipantJoined);
      tableSocket.off("table:owner-claimed", handleOwnerClaimed);
      tableSocket.off("table:owner-verified", handleOwnerVerified);
      tableSocket.off(
        "table:ownership-transfer-requested",
        handleOwnershipTransferRequested,
      );
      tableSocket.off(
        "table:ownership-transfer-responded",
        handleOwnershipTransferResponded,
      );
      tableSocket.off("disconnect", handleDisconnect);
      tableSocket.off("cart:item-added", handleItemAdded);
      tableSocket.off("cart:item-updated", handleItemUpdated);
      tableSocket.off("cart:item-removed", handleItemRemoved);
      tableSocket.off("cart:error", handleCartError);
    };
  }, [
    displayName,
    accountDisplayName,
    isReady,
    isSignedIn,
    participantPublicId,
    participantRole,
    router,
    setParticipantIdentity,
    token,
  ]);

  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-emerald-300">Live: {status}</p>
      {notice ? (
        <p className="rounded-md border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
