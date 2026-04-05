import { Router } from "express";
import { cleanupStories, createStory, feedStories, markStoryViewed } from "../controllers/story.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";
import { adminGuard } from "../middleware/admin";

const router = Router();

router.get("/feed", authGuard, feedStories);
router.post("/", authGuard, csrfGuard, createStory);
router.post("/view", authGuard, csrfGuard, markStoryViewed);
router.post("/cleanup", authGuard, adminGuard, csrfGuard, cleanupStories);

export default router;
