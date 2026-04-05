import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthRequest extends Request {
  user?: { userId: string; planTier: "FREE" | "PREMIUM"; role: "USER" | "ADMIN" | "SUPERADMIN" };
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction): void {
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
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
}
