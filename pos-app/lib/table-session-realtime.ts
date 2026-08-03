import { io } from "socket.io-client";

import { getRealtimeUrl } from "@/lib/socket-config";

const realtimeUrl = getRealtimeUrl();

export type TableSessionRefreshReason = "session-checked-out";

// Server actions use this to refresh customer table pages after staff-only
// changes, such as closing the dining visit from the floor tablet.
export async function notifyTableSessionChanged({
  message,
  reason,
  token,
}: {
  message?: string;
  reason: TableSessionRefreshReason;
  token: string;
}) {
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
      socket.emit("table:notify", { message, reason, token });
      finish();
    });

    socket.on("connect_error", finish);
    socket.connect();
  });
}
