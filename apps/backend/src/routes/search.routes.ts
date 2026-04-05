import { Router } from "express";
import { authGuard } from "../middleware/auth";
import { searchGlobal } from "../controllers/chat.controller";

const router = Router();

router.get("/global", authGuard, searchGlobal);

export default router;
