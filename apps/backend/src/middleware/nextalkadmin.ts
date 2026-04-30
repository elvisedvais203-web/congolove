import { Response, NextFunction } from "express";
import { AuthRequest } from "./nextalkauth";

export function adminGuard(req: AuthRequest, res: Response, next: NextFunction): void {
  const role = req.user?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    res.status(403).json({ message: "Acces reserve aux administrateurs" });
    return;
  }

  next();
}
