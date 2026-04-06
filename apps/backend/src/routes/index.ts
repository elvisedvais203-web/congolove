import { Router } from "express";
import authRoutes from "./auth.routes";
import matchingRoutes from "./matching.routes";
import messageRoutes from "./message.routes";
import paymentRoutes from "./payment.routes";
import profileRoutes from "./profile.routes";
import moderationRoutes from "./moderation.routes";
import securityRoutes from "./security.routes";
import socialRoutes from "./social.routes";
import storyRoutes from "./story.routes";
import chatRoutes from "./chat.routes";
import presenceRoutes from "./presence.routes";
import searchRoutes from "./search.routes";
import aiRoutes from "./ai.routes";
import mediaRoutes from "./media.routes";
import notificationsRoutes from "./notifications.routes";
import paymentWebhookRoutes from "./payment-webhook.routes";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));
router.use("/auth", authRoutes);
router.use("/matching", matchingRoutes);
router.use("/messages", messageRoutes);
router.use("/payments", paymentRoutes);
router.use("/profile", profileRoutes);
router.use("/moderation", moderationRoutes);
router.use("/security", securityRoutes);
router.use("/social", socialRoutes);
router.use("/stories", storyRoutes);
router.use("/chats", chatRoutes);
router.use("/presence", presenceRoutes);
router.use("/search", searchRoutes);
router.use("/ai", aiRoutes);
router.use("/media", mediaRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/webhooks/payments", paymentWebhookRoutes);

export default router;
