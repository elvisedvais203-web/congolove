import { Router } from "express";
import { authGuard } from "../middleware/auth";
import { postPresencePing, getPresence } from "../controllers/chat.controller";

const router = Router();

router.get("/online", authGuard, getPresence);
router.post("/ping", authGuard, postPresencePing);

export default router;
