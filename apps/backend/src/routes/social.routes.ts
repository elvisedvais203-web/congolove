import { Router } from "express";
import { addComment, createPost, feed, follow, network, suggestions, toggleLike, unfollow } from "../controllers/social.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";

const router = Router();

router.get("/network", authGuard, network);
router.get("/suggestions", authGuard, suggestions);
router.get("/feed", authGuard, feed);
router.post("/feed", authGuard, csrfGuard, createPost);
router.post("/feed/:postId/like", authGuard, csrfGuard, toggleLike);
router.post("/feed/:postId/comment", authGuard, csrfGuard, addComment);
router.post("/follow", authGuard, csrfGuard, follow);
router.post("/unfollow", authGuard, csrfGuard, unfollow);

export default router;
