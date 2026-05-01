import { createServer } from "http";
import { Server } from "socket.io";
import { env } from "./config/nextalkenv";
import { createApp } from "./nextalkapp";
import { registerChatSocket } from "./sockets/nextalkchat.socket";
import { logger } from "./utils/nextalklogger";
import { prisma } from "./config/nextalkdb";
import { redis } from "./config/nextalkredis";
import { ensureBootstrapData } from "./services/nextalkbootstrap.service";

let server: ReturnType<typeof createServer>["listen"] extends (...args: never[]) => infer T ? T : never;
let io: Server;

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.warn(`Arret en cours (${signal})`);

  server?.close(async () => {
    try {
      io?.close();
      await prisma.$disconnect();
      redis.disconnect();
      logger.info("Arret propre termine");
      process.exit(0);
    } catch (error) {
      logger.error("Erreur pendant l'arret", {
        message: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Arret force apres timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { message: error.message });
  void shutdown("uncaughtException");
});

async function start() {
  try {
    await prisma.$connect();
    await ensureBootstrapData();

    const app = createApp();
    const httpServer = createServer(app);

    io = new Server(httpServer, {
      cors: {
        origin: env.corsOrigins,
        credentials: true
      }
    });

    registerChatSocket(io);

    server = httpServer.listen(env.port, () => {
      logger.info(`API et Socket.io en cours sur le port ${env.port}`);
    });
  } catch (error) {
    logger.error("Echec du demarrage backend", {
      message: error instanceof Error ? error.message : String(error)
    });
    await prisma.$disconnect().catch(() => undefined);
    redis.disconnect();
    process.exit(1);
  }
}

void start();

