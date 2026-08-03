import { io } from "socket.io-client";

import { getRealtimeUrl } from "@/lib/socket-config";

const realtimeUrl = getRealtimeUrl();

type KitchenRefreshReason =
  | "dine-in-submitted"
  | "takeout-submitted"
  | "dine-in-ready"
  | "takeout-ready";

// Server-side notifier used by Next server actions/API routes after DB writes.
export async function notifyKitchenQueueChanged(reason: KitchenRefreshReason) {
  await new Promise<void>((resolve) => {
    const socket = io(realtimeUrl, {
      autoConnect: false,
      reconnection: false,
      timeout: 1000,
      transports: ["websocket"],
    });

    const finish = () => {
      socket.disconnect();
      resolve();
    };

    socket.on("connect", () => {
      socket.emit("kitchen:notify", { reason });
      finish();
    });

    socket.on("connect_error", finish);
    socket.connect();
  });
}
