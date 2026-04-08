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
import { prisma } from "../config/db";
import { redis } from "../config/redis";

const router = Router();

router.get("/health", (_req, res) => {
	res.json({
		ok: true,
		service: "kongo-love-backend",
		uptimeSec: Math.round(process.uptime()),
		timestamp: new Date().toISOString()
	});
});

router.get("/ready", async (_req, res) => {
	const checks = {
		database: false,
		redis: false
	};

	try {
		await prisma.$queryRaw`SELECT 1`;
		checks.database = true;
	} catch {
		checks.database = false;
	}

	try {
		const pong = await redis.ping();
		checks.redis = pong === "PONG";
	} catch {
		checks.redis = false;
	}

	const ok = checks.database;
	res.status(ok ? 200 : 503).json({
		ok,
		checks,
		timestamp: new Date().toISOString()
	});
});
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
