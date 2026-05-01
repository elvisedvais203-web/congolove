import { Router } from "express";
import { authGuard } from "../middleware/nextalkauth";
import { searchGlobal } from "../controllers/nextalkchat.controller";

const router = Router();

router.get("/global", authGuard, searchGlobal);

export default router;
