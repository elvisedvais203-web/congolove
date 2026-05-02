import { io } from "socket.io-client";

function resolveSocketUrl(): string {
  const socketEnv = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (socketEnv) return socketEnv;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000";
    }
    if (hostname.endsWith(".onrender.com")) {
      return "https://solola-api.onrender.com";
    }
  }
  return "http://localhost:4000";
}

export const socket = io(resolveSocketUrl(), {
  autoConnect: false,
  transports: ["websocket", "polling"]
});
