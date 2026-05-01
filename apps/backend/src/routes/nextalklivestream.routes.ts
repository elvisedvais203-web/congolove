import { Router, Request, Response, NextFunction } from "express";
import {
  createLiveStream,
  startLiveStream,
  endLiveStream,
  joinLiveStream,
  leaveLiveStream,
  getLiveStream,
  getActiveLiveStreams,
  getBroadcasterLiveStreams,
  updateLiveStream,
  getStreamViewerCount
} from "../services/nextalklivestream.service";
import { authenticateToken } from "../middleware/nextalkauth.middleware";
import { z } from "zod";
import { logger } from "../utils/nextalklogger";
import { ApiError } from "../utils/nextalkapierror";

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "SEMI_PRIVATE"]).optional(),
  allowComments: z.boolean().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional()
});

const updateStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "SEMI_PRIVATE"]).optional(),
  allowComments: z.boolean().optional()
});

// ==================== ROUTES ====================

/**
 * POST /live/streams
 * Create a new live stream
 */
router.post(
  "/",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createStreamSchema.parse(req.body);

      const stream = await createLiveStream({
        broadcasterId: (req as any).userId,
        title: validated.title,
        description: validated.description || undefined,
        visibility: (validated.visibility as any) || "PUBLIC",
        allowComments: validated.allowComments,
        categoryId: validated.categoryId,
        tags: validated.tags,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : undefined
      });

      res.status(201).json({
        success: true,
        data: stream
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /live/streams/:streamId/start
 * Start a scheduled live stream
 */
router.post(
  "/:streamId/start",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = await startLiveStream(req.params.streamId, (req as any).userId);

      res.json({
        success: true,
        data: stream
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /live/streams/:streamId/end
 * End a live stream
 */
router.post(
  "/:streamId/end",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = await endLiveStream(req.params.streamId, (req as any).userId);

      res.json({
        success: true,
        data: stream
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /live/streams/:streamId/join
 * Join a live stream as a viewer
 */
router.post(
  "/:streamId/join",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await joinLiveStream(req.params.streamId, (req as any).userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /live/streams/:streamId/leave
 * Leave a live stream
 */
router.post(
  "/:streamId/leave",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await leaveLiveStream(req.params.streamId, (req as any).userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /live/streams/:streamId
 * Get live stream details
 */
router.get(
  "/:streamId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = await getLiveStream(req.params.streamId);

      res.json({
        success: true,
        data: stream
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /live/streams/:streamId/viewers
 * Get viewer count for a stream
 */
router.get(
  "/:streamId/viewers",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const viewerCount = await getStreamViewerCount(req.params.streamId);

      res.json({
        success: true,
        data: {
          streamId: req.params.streamId,
          viewerCount
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /live/streams
 * Get active live streams (paginated)
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;

      const result = await getActiveLiveStreams(limit, offset);

      res.json({
        success: true,
        data: result.streams,
        pagination: {
          limit: result.limit,
          offset: result.offset,
          total: result.total
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /live/streams/broadcaster/:broadcasterId
 * Get broadcaster's live stream history
 */
router.get(
  "/broadcaster/:broadcasterId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;

      const result = await getBroadcasterLiveStreams(req.params.broadcasterId, limit, offset);

      res.json({
        success: true,
        data: result.streams,
        pagination: {
          limit: result.limit,
          offset: result.offset,
          total: result.total
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /live/streams/:streamId
 * Update live stream info
 */
router.patch(
  "/:streamId",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateStreamSchema.parse(req.body);

      const stream = await updateLiveStream(
        req.params.streamId,
        (req as any).userId,
        validated
      );

      res.json({
        success: true,
        data: stream
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
