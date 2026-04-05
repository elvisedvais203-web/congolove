import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";
import { validateCsrfToken } from "../services/csrf.service";

export async function csrfGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  if (!req.user?.userId) {
    res.status(401).json({ message: "Authentification requise" });
    return;
  }

  const csrfToken = req.header("x-csrf-token");
  if (!csrfToken) {
    res.status(403).json({ message: "CSRF token manquant" });
    return;
  }

  const valid = await validateCsrfToken(req.user.userId, csrfToken);
  if (!valid) {
    res.status(403).json({ message: "CSRF token invalide" });
    return;
  }

  next();
}
