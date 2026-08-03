// One source of truth for the Socket.IO endpoint used by browser clients and
// server-side realtime notifications.
export function getRealtimeUrl() {
  return process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://192.168.1.58:3001";
}
