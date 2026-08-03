import type { Server, Socket } from "socket.io";

export function notifyFloor(io: Server, reason: string) {
  io.to("floor").emit("floor:refresh", { reason });
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
