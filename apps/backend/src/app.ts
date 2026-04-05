import "express-async-errors";
import express from "express";
import routes from "./routes";
import { applySecurityMiddlewares } from "./middleware/security";
import { errorHandler } from "./middleware/errorHandler";
import { auditTrail } from "./middleware/auditTrail";

export function createApp() {
  const app = express();

  applySecurityMiddlewares(app);
  app.use(auditTrail);
  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
