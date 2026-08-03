"use client";

import { io } from "socket.io-client";

import { getRealtimeUrl } from "@/lib/socket-config";

const realtimeUrl = getRealtimeUrl();

// One browser tab should use one Socket.IO connection for this table page.
// The live client joins the room; buttons reuse this socket to send cart events.
// Cookies are included so the server can attach loyalty accounts when signed in.
export const tableSocket = io(realtimeUrl, {
  autoConnect: false,
  withCredentials: true,
});
