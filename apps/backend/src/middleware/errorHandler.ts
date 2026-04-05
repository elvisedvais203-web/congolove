import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: "Erreur interne du serveur" });
}
