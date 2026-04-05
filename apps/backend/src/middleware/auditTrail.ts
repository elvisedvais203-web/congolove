import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";
import { writeAuditLog } from "../services/audit.service";

export function auditTrail(req: AuthRequest, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", async () => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return;
    }

    const action = `${req.method} ${req.path}`;
    await writeAuditLog({
      userId: req.user?.userId,
      action,
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      statusCode: res.statusCode,
      metadata: { durationMs: Date.now() - start }
    });
  });

  next();
}
