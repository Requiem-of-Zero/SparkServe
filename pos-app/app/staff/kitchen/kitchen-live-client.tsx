"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const realtimeUrl =
  process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://192.168.1.58:3001";

// Client-side listener for kitchen queue invalidation events.
// When the socket says the queue changed, router.refresh() re-renders the
// server page and pulls the latest submitted dine-in/takeout rows from Postgres.
export function KitchenLiveClient() {
  const router = useRouter();
  const [status, setStatus] = useState("Connecting...");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(realtimeUrl, {
      withCredentials: true,
    });

    function handleConnect() {
      setStatus("Connected");
      socket.emit("kitchen:join");
    }

    function handleDisconnect() {
      setStatus("Disconnected");
    }

    function handleRefresh({ reason }: { reason?: string }) {
      setNotice(reason ? `Queue updated: ${reason}` : "Queue updated.");
      router.refresh();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("kitchen:refresh", handleRefresh);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("kitchen:refresh", handleRefresh);
      socket.disconnect();
    };
  }, [router]);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-emerald-300">Live kitchen: {status}</p>
      {notice ? (
        <p className="rounded-md border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
