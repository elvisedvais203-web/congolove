import { Router, Request, Response, NextFunction } from "express";
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getCall,
  updateParticipantMediaState,
  getUserCallHistory,
  createCallRecording,
  detectMissedCall
} from "../services/nextalkvideocall.service";
import { authenticateToken } from "../middleware/nextalkauth.middleware";
import { z } from "zod";
import { logger } from "../utils/nextalklogger";

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const initiateCallSchema = z.object({
  recipientId: z.string().min(1),
  type: z.enum(["AUDIO", "VIDEO"])
});

const updateMediaStateSchema = z.object({
  audioEnabled: z.boolean().optional(),
  videoEnabled: z.boolean().optional(),
  screenSharing: z.boolean().optional(),
  isMuted: z.boolean().optional()
});

const createRecordingSchema = z.object({
  recordingUrl: z.string().url(),
  duration: z.number().positive(),
  fileSize: z.number().positive()
});

// ==================== ROUTES ====================

/**
 * POST /video/calls
 * Initiate a video/audio call
 */
router.post(
  "/",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = initiateCallSchema.parse(req.body);

      const call = await initiateCall({
        initiatorId: (req as any).userId,
        recipientId: validated.recipientId,
        type: validated.type
      });

      res.status(201).json({
        success: true,
        data: call
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /video/calls/:callId/accept
 * Accept an incoming call
 */
router.post(
  "/:callId/accept",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await acceptCall({
        callId: req.params.callId,
        recipientId: (req as any).userId
      });

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
 * POST /video/calls/:callId/reject
 * Reject an incoming call
 */
router.post(
  "/:callId/reject",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reason = req.body.reason || "DECLINED";

      const call = await rejectCall({
        callId: req.params.callId,
        recipientId: (req as any).userId,
        reason
      });

      res.json({
        success: true,
        data: call
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /video/calls/:callId/end
 * End an active call
 */
router.post(
  "/:callId/end",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const call = await endCall({
        callId: req.params.callId,
        userId: (req as any).userId
      });

      res.json({
        success: true,
        data: call
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /video/calls/:callId
 * Get call details
 */
router.get(
  "/:callId",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const call = await getCall(req.params.callId);

      res.json({
        success: true,
        data: call
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /video/calls/:callId/media-state
 * Update participant media state (mute/unmute, video on/off, etc.)
 */
router.patch(
  "/:callId/media-state",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateMediaStateSchema.parse(req.body);

      const participant = await updateParticipantMediaState(
        req.params.callId,
        (req as any).userId,
        validated
      );

      res.json({
        success: true,
        data: participant
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /video/calls/history
 * Get call history for current user
 */
router.get(
  "/",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;

      const result = await getUserCallHistory((req as any).userId, limit, offset);

      res.json({
        success: true,
        data: result.calls,
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
 * POST /video/calls/:callId/recording
 * Create a recording for a completed call
 */
router.post(
  "/:callId/recording",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createRecordingSchema.parse(req.body);

      const recording = await createCallRecording(
        req.params.callId,
        validated.recordingUrl,
        validated.duration,
        validated.fileSize
      );

      res.status(201).json({
        success: true,
        data: recording
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /video/calls/:callId/check-missed
 * Check and mark if call was missed
 */
router.post(
  "/:callId/check-missed",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const missedCall = await detectMissedCall(req.params.callId);

      res.json({
        success: true,
        data: missedCall || { message: "Call still ringing or no action needed" }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
