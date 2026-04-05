import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives d authentification" }
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Debit messages trop eleve" }
});

export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Limite paiement atteinte, reessayez plus tard" }
});

export function applySecurityMiddlewares(app: Express): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", env.corsOrigin],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"]
        }
      },
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
}
