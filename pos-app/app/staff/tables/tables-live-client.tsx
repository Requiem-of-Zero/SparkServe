"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { getRealtimeUrl } from "@/lib/socket-config";

const realtimeUrl = getRealtimeUrl();

type CheckoutRequestNotice = {
  orderCount: number;
  requestedAt: string;
  requestedBy: string;
  tableLabel: string;
  tableSessionId: number;
  token: string;
  unpaidTotalCents: number;
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Keeps the staff floor terminal live by refreshing the server-rendered table
// snapshot whenever table sessions, guests, carts, or moves change.
export function TablesLiveClient() {
  const router = useRouter();
  const [status, setStatus] = useState("Connecting...");
  const [notice, setNotice] = useState<string | null>(null);
  const [checkoutRequest, setCheckoutRequest] =
    useState<CheckoutRequestNotice | null>(null);

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

    function handleCheckoutRequested(request: CheckoutRequestNotice) {
      setCheckoutRequest(request);
      setNotice(
        `${request.tableLabel} requested checkout for ${formatPrice(
          request.unpaidTotalCents,
        )}.`,
      );
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("floor:refresh", handleRefresh);
    socket.on("floor:checkout-requested", handleCheckoutRequested);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("floor:refresh", handleRefresh);
      socket.off("floor:checkout-requested", handleCheckoutRequested);
      socket.disconnect();
    };
  }, [router]);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-emerald-300">Live floor: {status}</p>
      {checkoutRequest ? (
        <div className="animate-pulse rounded-md border border-emerald-400 bg-emerald-950 px-3 py-2 text-sm text-emerald-50">
          <p className="font-semibold">
            Checkout requested at {checkoutRequest.tableLabel}
          </p>
          <p className="mt-1 text-emerald-100">
            {checkoutRequest.requestedBy} needs help closing{" "}
            {checkoutRequest.orderCount} order
            {checkoutRequest.orderCount === 1 ? "" : "s"} for{" "}
            {formatPrice(checkoutRequest.unpaidTotalCents)}.
          </p>
        </div>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
