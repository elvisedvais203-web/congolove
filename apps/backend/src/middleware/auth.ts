import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { getAccountRestriction } from "../services/account-restriction.service";
import { getSessionInvalidatedAt } from "../services/session-security.service";

export interface AuthRequest extends Request {
  user?: { userId: string; planTier: "FREE" | "PREMIUM"; role: "USER" | "ADMIN" | "SUPERADMIN" };
}

export async function authGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Token manquant" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as {
      userId: string;
      planTier: "FREE" | "PREMIUM";
      role: "USER" | "ADMIN" | "SUPERADMIN";
      iat?: number;
    };

    const invalidatedAt = await getSessionInvalidatedAt(payload.userId);
    if (invalidatedAt && payload.iat) {
      const tokenIssuedAtMs = payload.iat * 1000;
      if (tokenIssuedAtMs <= invalidatedAt.getTime()) {
        res.status(401).json({ message: "Session invalidee. Reconnectez-vous." });
        return;
      }
    }

    const restriction = await getAccountRestriction(payload.userId);
    if (restriction.active) {
      const message = restriction.type === "BANNED"
        ? "Compte banni. Contactez le support."
        : "Compte suspendu temporairement. Reessayez plus tard.";
      res.status(403).json({
        message,
        restriction: {
          type: restriction.type,
          reason: restriction.reason,
          until: restriction.until ?? null
        }
      });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
}
