"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { getRealtimeUrl } from "@/lib/socket-config";

const realtimeUrl = getRealtimeUrl();

// Keeps the staff floor terminal live by refreshing the server-rendered table
// snapshot whenever table sessions, guests, carts, or moves change.
export function TablesLiveClient() {
  const router = useRouter();
  const [status, setStatus] = useState("Connecting...");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(realtimeUrl, {
      withCredentials: true,
    });

    function handleConnect() {
      setStatus("Connected");
      socket.emit("floor:join");
    }

    function handleDisconnect() {
      setStatus("Disconnected");
    }

    function handleRefresh({ reason }: { reason?: string }) {
      setNotice(reason ? `Floor updated: ${reason}` : "Floor updated.");
      router.refresh();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("floor:refresh", handleRefresh);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("floor:refresh", handleRefresh);
      socket.disconnect();
    };
  }, [router]);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-emerald-300">Live floor: {status}</p>
      {notice ? (
        <p className="rounded-md border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
