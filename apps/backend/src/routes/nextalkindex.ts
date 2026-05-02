import { Router } from "express";
import authRoutes from "./nextalkauth.routes";
import matchingRoutes from "./nextalkmatching.routes";
import messageRoutes from "./nextalkmessage.routes";
import paymentRoutes from "./nextalkpayment.routes";
import profileRoutes from "./nextalkprofile.routes";
import moderationRoutes from "./nextalkmoderation.routes";
import securityRoutes from "./nextalksecurity.routes";
import socialRoutes from "./nextalksocial.routes";
import storyRoutes from "./nextalkstory.routes";
import chatRoutes from "./nextalkchat.routes";
import presenceRoutes from "./nextalkpresence.routes";
import searchRoutes from "./nextalksearch.routes";
import aiRoutes from "./nextalkai.routes";
import aiModerationRoutes from "./nextalkai-moderation.routes";
import mediaRoutes from "./nextalkmedia.routes";
import notificationsRoutes from "./nextalknotifications.routes";
import paymentWebhookRoutes from "./nextalkpayment-webhook.routes";
import usernameRoutes from "./nextalkusername.routes";
import contactsRoutes from "./nextalkcontacts.routes";
import privacyRoutes from "./nextalkprivacy.routes";
import { prisma } from "../config/nextalkdb";
import { redis } from "../config/nextalkredis";
import { env } from "../config/nextalkenv";

const router = Router();

router.get("/", (_req, res) => {
	res.json({
		ok: true,
		service: "NexTalk API",
		message: "API root is active",
		uptimeSec: Math.round(process.uptime()),
		timestamp: new Date().toISOString()
	});
});

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
		redis: false,
		redisConfigured: env.redisConfigured
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
router.use("/moderation/ai", aiModerationRoutes);
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
router.use("/username", usernameRoutes);
router.use("/contacts", contactsRoutes);
router.use("/privacy", privacyRoutes);

export default router;

