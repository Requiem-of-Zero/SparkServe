import type { Server, Socket } from "socket.io";

export function registerKitchenHandlers({
  io,
  socket,
}: {
  io: Server;
  socket: Socket;
}) {
  socket.on("kitchen:join", () => {
    socket.join("kitchen");
    socket.emit("kitchen:joined");
    console.log(`${socket.id} joined kitchen queue`);
  });

  socket.on("kitchen:notify", ({ reason }: { reason?: string } = {}) => {
    // This is an invalidation event, not source-of-truth order data.
    // Kitchen browsers refresh their server page and re-read Postgres.
    io.to("kitchen").emit("kitchen:refresh", {
      reason: typeof reason === "string" ? reason : "queue-updated",
    });
  });
}
