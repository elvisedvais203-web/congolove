import { NextFunction, Response } from "express";
import { AuthRequest } from "./nextalkauth";

export async function csrfGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  void req;
  void res;
  // Bypass temporaire: desactive le controle CSRF pendant la phase sans authentification.
  next();
}
