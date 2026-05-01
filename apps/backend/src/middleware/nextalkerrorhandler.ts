import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/nextalkapierror";
import { logger } from "../utils/nextalklogger";
import { env } from "../config/nextalkenv";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(`API Error: ${err.message}`, { statusCode: err.statusCode });
    }
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  logger.error("Unhandled error", { message: err.message, stack: err.stack });

  const includeDetails = env.nodeEnv === "development";
  res.status(500).json({
    message: "Erreur interne du serveur",
    ...(includeDetails && { detail: err.message })
  });
}
