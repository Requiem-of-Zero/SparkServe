import { Server } from "socket.io";

const io = new Server(3001, {
  cors: {
    origin: "http://192.168.1.58:3000",
  },
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("table:join", ({ token }: { token: string }) => {
    const room = `table-session:${token}`;

    socket.join(room);

    socket.emit("table:joined", {
      room,
      socketId: socket.id,
    });

    console.log(`${socket.id} joined ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

console.log("Realtime server listening on http://192.168.1.58:3001");
