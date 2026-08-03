import type { Server, Socket } from "socket.io";

export type FloorCheckoutRequestPayload = {
  orderCount: number;
  requestedAt: string;
  requestedBy: string;
  tableLabel: string;
  tableSessionId: number;
  token: string;
  unpaidTotalCents: number;
};

export function notifyFloor(io: Server, reason: string) {
  io.to("floor").emit("floor:refresh", { reason });
}

export function notifyFloorCheckoutRequested(
  io: Server,
  payload: FloorCheckoutRequestPayload,
) {
  io.to("floor").emit("floor:checkout-requested", payload);
}

export function registerFloorHandlers({
  io,
  socket,
}: {
  io: Server;
  socket: Socket;
}) {
  socket.on("floor:join", () => {
    socket.join("floor");
    socket.emit("floor:joined");
    console.log(`${socket.id} joined floor view`);
  });

  socket.on("floor:notify", ({ reason }: { reason?: string } = {}) => {
    // This is an invalidation event; staff floor clients refresh from Postgres.
    notifyFloor(io, typeof reason === "string" ? reason : "floor-updated");
  });
}
