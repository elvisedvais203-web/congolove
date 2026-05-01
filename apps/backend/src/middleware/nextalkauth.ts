import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/nextalkenv";
import { getAccountRestriction } from "../services/nextalkaccount-restriction.service";
import { getSessionInvalidatedAt } from "../services/nextalksession-security.service";
import { prisma } from "../config/nextalkdb";

export interface AuthRequest extends Request {
  user?: { userId: string; planTier: "FREE" | "PREMIUM"; role: "USER" | "ADMIN" | "SUPERADMIN" };
}

export async function authGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    // Bypass temporaire auth: injecte un utilisateur de demo pour avancer sans connexion.
    const demoUser = await prisma.user.findFirst({
      select: { id: true, planTier: true, role: true },
      orderBy: { createdAt: "asc" }
    });
    if (demoUser) {
      req.user = { userId: demoUser.id, planTier: demoUser.planTier, role: demoUser.role };
      next();
      return;
    }

    res.status(401).json({ message: "Aucun utilisateur demo disponible. Lancez le seed d'abord." });
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
