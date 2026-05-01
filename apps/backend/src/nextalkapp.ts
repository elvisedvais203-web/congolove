import "express-async-errors";
import express from "express";
import routes from "./routes/nextalkindex";
import { applySecurityMiddlewares } from "./middleware/nextalksecurity";
import { errorHandler } from "./middleware/nextalkerrorhandler";
import { auditTrail } from "./middleware/nextalkaudittrail";

export function createApp() {
  const app = express();

  app.get("/", (_req, res) => {
    res.json({
      service: "NexTalk API",
      ok: true,
      health: "/health"
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  applySecurityMiddlewares(app);
  app.use(auditTrail);
  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
