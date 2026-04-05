import { createServer } from "http";
import { Server } from "socket.io";
import { env } from "./config/env";
import { createApp } from "./app";
import { registerChatSocket } from "./sockets/chat.socket";
import { logger } from "./utils/logger";

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.corsOrigin,
    credentials: true
  }
});

registerChatSocket(io);

httpServer.listen(env.port, () => {
  logger.info(`API et Socket.io en cours sur le port ${env.port}`);
});
