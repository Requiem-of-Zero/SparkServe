import "dotenv/config";

import { Server } from "socket.io";
import {
  createSocketCorsOptions,
  getAllowedSocketOrigins,
  getSocketPort,
} from "./socket/config";
import { registerFloorHandlers } from "./socket/floor-handlers";
import { registerKitchenHandlers } from "./socket/kitchen-handlers";
import { registerTableSessionHandlers } from "./socket/table-session-handlers";

const port = getSocketPort();
const allowedOrigins = getAllowedSocketOrigins();

// The realtime process is shared by table ordering, floor status, and kitchen queue screens.
const io = new Server(port, {
  cors: createSocketCorsOptions(allowedOrigins),
});

console.log(`Realtime CORS origins: ${allowedOrigins.join(", ")}`);

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  registerTableSessionHandlers({ io, socket });
  registerFloorHandlers({ io, socket });
  registerKitchenHandlers({ io, socket });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

console.log(`Realtime server listening on port ${port}`);
