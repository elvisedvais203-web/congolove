import { Router } from "express";
import { addComment, createPost, feed, follow, network, savedFeed, suggestions, toggleLike, toggleSave, unfollow } from "../controllers/nextalksocial.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";

const router = Router();

router.get("/network", authGuard, network);
router.get("/suggestions", authGuard, suggestions);
router.get("/feed", authGuard, feed);
router.get("/feed/saved", authGuard, savedFeed);
router.post("/feed", authGuard, csrfGuard, createPost);
router.post("/feed/:postId/like", authGuard, csrfGuard, toggleLike);
router.post("/feed/:postId/save", authGuard, csrfGuard, toggleSave);
router.post("/feed/:postId/comment", authGuard, csrfGuard, addComment);
router.post("/follow", authGuard, csrfGuard, follow);
router.post("/unfollow", authGuard, csrfGuard, unfollow);

export default router;
