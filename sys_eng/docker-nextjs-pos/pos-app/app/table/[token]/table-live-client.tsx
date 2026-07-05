"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function TableLiveClient({ token }: { token: string }) {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    const socket = io("http://192.168.1.58:3001");

    socket.on("connect", () => {
      setStatus("Connected");
      socket.emit("table:join", { token });
    });

    socket.on("table:joined", ({ room }) => {
      setStatus(`Joined ${room}`);
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return <p className="mt-2 text-sm text-emerald-300">Live: {status}</p>;
}
