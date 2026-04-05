import { Router } from "express";
import { getCsrfToken } from "../controllers/security.controller";
import { authGuard } from "../middleware/auth";

const router = Router();

router.get("/csrf-token", authGuard, getCsrfToken);

export default router;
