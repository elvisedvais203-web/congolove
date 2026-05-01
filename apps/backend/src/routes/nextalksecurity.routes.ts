import { Router } from "express";
import { getCsrfToken } from "../controllers/nextalksecurity.controller";
import { authGuard } from "../middleware/nextalkauth";

const router = Router();

router.get("/csrf-token", authGuard, getCsrfToken);

export default router;
