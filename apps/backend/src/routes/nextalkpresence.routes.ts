import { Router } from "express";
import { authGuard } from "../middleware/nextalkauth";
import { postPresencePing, getPresence } from "../controllers/nextalkchat.controller";

const router = Router();

router.get("/online", authGuard, getPresence);
router.post("/ping", authGuard, postPresencePing);

export default router;
