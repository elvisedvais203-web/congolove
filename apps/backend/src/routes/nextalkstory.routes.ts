import { Router } from "express";
import { cleanupStories, createStory, feedStories, markStoryViewed } from "../controllers/nextalkstory.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import { adminGuard } from "../middleware/nextalkadmin";

const router = Router();

router.get("/feed", authGuard, feedStories);
router.post("/", authGuard, csrfGuard, createStory);
router.post("/view", authGuard, csrfGuard, markStoryViewed);
router.post("/cleanup", authGuard, adminGuard, csrfGuard, cleanupStories);

export default router;
