import { Response } from "express";
import { AuthRequest } from "../middleware/nextalkauth";
import { issueCsrfToken } from "../services/nextalkcsrf.service";

export async function getCsrfToken(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const csrfToken = await issueCsrfToken(userId);
  res.json({ csrfToken, ttlSeconds: 1800 });
}
