import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { issueCsrfToken } from "../services/csrf.service";

export async function getCsrfToken(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const csrfToken = await issueCsrfToken(userId);
  res.json({ csrfToken, ttlSeconds: 1800 });
}
