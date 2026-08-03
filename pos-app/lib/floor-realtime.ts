import { io } from "socket.io-client";

import { getRealtimeUrl } from "@/lib/socket-config";

const realtimeUrl = getRealtimeUrl();

export type FloorRefreshReason =
  | "attendees-updated"
  | "cart-changed"
  | "owner-verified"
  | "participant-joined"
  | "session-cancelled"
  | "session-security-updated"
  | "table-transfer-updated"
  | "kitchen-order-submitted";

// Server actions call this after DB writes so staff floor tablets can refresh
// their server-rendered table/session snapshot without manual reloads.
export async function notifyFloorChanged(reason: FloorRefreshReason) {
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
      socket.emit("floor:notify", { reason });
      finish();
    });

    socket.on("connect_error", finish);
    socket.connect();
  });
}
