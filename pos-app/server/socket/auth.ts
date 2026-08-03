import type { Socket } from "socket.io";

import { auth } from "../../lib/auth";

// Socket.IO exposes raw handshake headers; Better Auth expects a Headers object.
function getSocketHeaders(
  headers: Record<string, string | string[] | undefined>,
) {
  const socketHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      socketHeaders.set(key, value.join(", "));
    } else if (value) {
      socketHeaders.set(key, value);
    }
  }

  return socketHeaders;
}

// Reads the logged-in customer account for this socket when cookies are present.
export async function getSocketUser(socket: Socket) {
  const session = await auth.api.getSession({
    headers: getSocketHeaders(socket.handshake.headers),
  });

  return session?.user;
}
