import { prisma } from "../config/nextalkdb";
import { redis } from "../config/nextalkredis";
import { ApiError } from "../utils/nextalkapierror";
import { generateAgoraToken } from "./nextalkagora.service";
import { logger } from "../utils/nextalklogger";
import { writeAuditLog } from "./nextalkaudit.service";

/**
 * Video Call Service
 * Manages video/audio call lifecycle, participants, and recordings
 */

interface InitiateCallInput {
  initiatorId: string;
  recipientId: string;
  type: "AUDIO" | "VIDEO";
}

interface AcceptCallInput {
  callId: string;
  recipientId: string;
}

interface RejectCallInput {
  callId: string;
  recipientId: string;
  reason?: "DECLINED" | "BUSY" | "UNREACHABLE";
}

interface EndCallInput {
  callId: string;
  userId: string;
}

/**
 * Initiate a video/audio call
 */
export async function initiateCall(input: InitiateCallInput) {
  try {
    // Validate users exist
    const [initiator, recipient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.initiatorId },
        select: { id: true }
      }),
      prisma.user.findUnique({
        where: { id: input.recipientId },
        select: { id: true }
      })
    ]);

    if (!initiator || !recipient) {
      throw new ApiError(404, "One or more users not found");
    }

    if (input.initiatorId === input.recipientId) {
      throw new ApiError(400, "Cannot call yourself");
    }

    // Check if recipient blocked initiator
    const isBlocked = await prisma.block.findUnique({
      where: {
        blockingUserId_blockedUserId: {
          blockingUserId: input.recipientId,
          blockedUserId: input.initiatorId
        }
      }
    });

    if (isBlocked) {
      throw new ApiError(403, "Recipient has blocked you");
    }

    // Check for existing active calls with recipient
    const existingCall = await prisma.videoCall.findFirst({
      where: {
        OR: [
          {
            initiatorId: input.initiatorId,
            recipientId: input.recipientId,
            status: { in: ["RINGING", "ACCEPTED", "ONGOING"] }
          },
          {
            initiatorId: input.recipientId,
            recipientId: input.initiatorId,
            status: { in: ["RINGING", "ACCEPTED", "ONGOING"] }
          }
        ]
      }
    });

    if (existingCall) {
      throw new ApiError(409, "Active call already exists with this user");
    }

    // Generate Agora channel ID
    const agoraChannelId = `call_${input.initiatorId}_${input.recipientId}_${Date.now()}`;

    // Create call record
    const call = await prisma.videoCall.create({
      data: {
        initiatorId: input.initiatorId,
        recipientId: input.recipientId,
        type: input.type,
        status: "RINGING",
        direction: "OUTGOING",
        agoraChannelId,
        createdAt: new Date()
      },
      include: {
        initiator: {
          select: { id: true, username: true, profile: { select: { displayName: true, profileImageUrl: true } } }
        },
        recipient: {
          select: { id: true, username: true, profile: { select: { displayName: true, profileImageUrl: true } } }
        }
      }
    });

    // Cache call info for quick retrieval
    await redis.setex(
      `call:${call.id}`,
      600, // 10 minutes
      JSON.stringify({
        id: call.id,
        status: call.status,
        type: call.type,
        agoraChannelId: call.agoraChannelId
      })
    );

    await writeAuditLog({
      userId: input.initiatorId,
      action: "VIDEO_CALL_INITIATED",
      method: "POST",
      path: "/video/calls",
      statusCode: 201,
      metadata: { callId: call.id, recipientId: input.recipientId, type: input.type }
    });

    logger.info(`Video call initiated: ${call.id}`, {
      initiatorId: input.initiatorId,
      recipientId: input.recipientId
    });

    return call;
  } catch (error) {
    logger.error("Failed to initiate call", {
      message: error instanceof Error ? error.message : String(error),
      initiatorId: input.initiatorId,
      recipientId: input.recipientId
    });
    throw error;
  }
}

/**
 * Accept an incoming call
 */
export async function acceptCall(input: AcceptCallInput) {
  try {
    const call = await prisma.videoCall.findUnique({
      where: { id: input.callId }
    });

    if (!call) {
      throw new ApiError(404, "Call not found");
    }

    if (call.recipientId !== input.recipientId) {
      throw new ApiError(403, "Unauthorized to accept this call");
    }

    if (call.status !== "RINGING") {
      throw new ApiError(400, `Cannot accept call with status: ${call.status}`);
    }

    // Add recipient as participant
    const initiatorToken = await generateAgoraToken(call.agoraChannelId, call.initiatorId, 1);
    const recipientToken = await generateAgoraToken(call.agoraChannelId, call.recipientId, 2);

    const updatedCall = await prisma.videoCall.update({
      where: { id: input.callId },
      data: {
        status: "ACCEPTED",
        wasAnswered: true,
        agoraToken: recipientToken,
        participants: {
          create: [
            {
              userId: call.initiatorId,
              agoraUid: 1
            },
            {
              userId: call.recipientId,
              agoraUid: 2
            }
          ]
        }
      },
      include: {
        initiator: {
          select: { id: true, username: true }
        },
        recipient: {
          select: { id: true, username: true }
        }
      }
    });

    // Update cache
    await redis.setex(`call:${input.callId}:status`, 600, "ACCEPTED");

    await writeAuditLog({
      userId: input.recipientId,
      action: "VIDEO_CALL_ACCEPTED",
      method: "POST",
      path: `/video/calls/${input.callId}/accept`,
      statusCode: 200,
      metadata: { callId: input.callId }
    });

    logger.info(`Video call accepted: ${input.callId}`, {
      recipientId: input.recipientId
    });

    return {
      call: updatedCall,
      tokens: {
        initiator: initiatorToken,
        recipient: recipientToken
      }
    };
  } catch (error) {
    logger.error("Failed to accept call", {
      message: error instanceof Error ? error.message : String(error),
      callId: input.callId
    });
    throw error;
  }
}

/**
 * Reject an incoming call
 */
export async function rejectCall(input: RejectCallInput) {
  try {
    const call = await prisma.videoCall.findUnique({
      where: { id: input.callId }
    });

    if (!call) {
      throw new ApiError(404, "Call not found");
    }

    if (call.recipientId !== input.recipientId) {
      throw new ApiError(403, "Unauthorized to reject this call");
    }

    if (call.status !== "RINGING") {
      throw new ApiError(400, `Cannot reject call with status: ${call.status}`);
    }

    const rejectionReason = input.reason || "DECLINED";

    const updatedCall = await prisma.videoCall.update({
      where: { id: input.callId },
      data: {
        status: "REJECTED",
        rejectionReason,
        endedAt: new Date()
      }
    });

    await redis.del(`call:${input.callId}`);

    await writeAuditLog({
      userId: input.recipientId,
      action: "VIDEO_CALL_REJECTED",
      method: "POST",
      path: `/video/calls/${input.callId}/reject`,
      statusCode: 200,
      metadata: { callId: input.callId, reason: rejectionReason }
    });

    logger.info(`Video call rejected: ${input.callId}`, {
      recipientId: input.recipientId,
      reason: rejectionReason
    });

    return updatedCall;
  } catch (error) {
    logger.error("Failed to reject call", {
      message: error instanceof Error ? error.message : String(error),
      callId: input.callId
    });
    throw error;
  }
}

/**
 * End an active call
 */
export async function endCall(input: EndCallInput) {
  try {
    const call = await prisma.videoCall.findUnique({
      where: { id: input.callId },
      include: {
        participants: true
      }
    });

    if (!call) {
      throw new ApiError(404, "Call not found");
    }

    // Verify user is part of the call
    const isParticipant = call.initiatorId === input.userId || call.recipientId === input.userId;
    if (!isParticipant) {
      throw new ApiError(403, "Unauthorized to end this call");
    }

    if (call.status === "ENDED" || call.status === "REJECTED") {
      throw new ApiError(400, `Call already ${call.status.toLowerCase()}`);
    }

    const endedAt = new Date();
    const startedAt = call.startedAt;
    const duration = startedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : 0;

    // Update participants' left time
    await Promise.all(
      call.participants.map((p) =>
        prisma.videoCallParticipant.update({
          where: { id: p.id },
          data: { leftAt: endedAt }
        })
      )
    );

    const updatedCall = await prisma.videoCall.update({
      where: { id: input.callId },
      data: {
        status: "ENDED",
        endedAt,
        duration
      }
    });

    await redis.del(`call:${input.callId}`);
    await redis.del(`call:${input.callId}:status`);

    await writeAuditLog({
      userId: input.userId,
      action: "VIDEO_CALL_ENDED",
      method: "POST",
      path: `/video/calls/${input.callId}/end`,
      statusCode: 200,
      metadata: { callId: input.callId, duration }
    });

    logger.info(`Video call ended: ${input.callId}`, {
      endedBy: input.userId,
      duration
    });

    return updatedCall;
  } catch (error) {
    logger.error("Failed to end call", {
      message: error instanceof Error ? error.message : String(error),
      callId: input.callId
    });
    throw error;
  }
}

/**
 * Get call details
 */
export async function getCall(callId: string) {
  try {
    const call = await prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        initiator: {
          select: { id: true, username: true, profile: { select: { displayName: true, profileImageUrl: true } } }
        },
        recipient: {
          select: { id: true, username: true, profile: { select: { displayName: true, profileImageUrl: true } } }
        },
        participants: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        }
      }
    });

    if (!call) {
      throw new ApiError(404, "Call not found");
    }

    return call;
  } catch (error) {
    logger.error("Failed to get call", {
      message: error instanceof Error ? error.message : String(error),
      callId
    });
    throw error;
  }
}

/**
 * Update participant media state
 */
export async function updateParticipantMediaState(
  callId: string,
  userId: string,
  state: {
    audioEnabled?: boolean;
    videoEnabled?: boolean;
    screenSharing?: boolean;
    isMuted?: boolean;
  }
) {
  try {
    const participant = await prisma.videoCallParticipant.findFirst({
      where: {
        call: { id: callId },
        userId
      }
    });

    if (!participant) {
      throw new ApiError(404, "Participant not found in this call");
    }

    const updatedParticipant = await prisma.videoCallParticipant.update({
      where: { id: participant.id },
      data: {
        ...state
      }
    });

    return updatedParticipant;
  } catch (error) {
    logger.error("Failed to update participant media state", {
      message: error instanceof Error ? error.message : String(error),
      callId,
      userId
    });
    throw error;
  }
}

/**
 * Get call history for a user
 */
export async function getUserCallHistory(userId: string, limit: number = 50, offset: number = 0) {
  try {
    const calls = await prisma.videoCall.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { recipientId: userId }
        ]
      },
      include: {
        initiator: {
          select: { id: true, username: true, profile: { select: { displayName: true, profileImageUrl: true } } }
        },
        recipient: {
          select: { id: true, username: true, profile: { select: { displayName: true, profileImageUrl: true } } }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    });

    const total = await prisma.videoCall.count({
      where: {
        OR: [
          { initiatorId: userId },
          { recipientId: userId }
        ]
      }
    });

    return {
      calls,
      total,
      limit,
      offset
    };
  } catch (error) {
    logger.error("Failed to get user call history", {
      message: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}

/**
 * Create a recording for a completed call
 */
export async function createCallRecording(
  callId: string,
  recordingUrl: string,
  duration: number,
  fileSize: number
) {
  try {
    const call = await prisma.videoCall.findUnique({
      where: { id: callId }
    });

    if (!call) {
      throw new ApiError(404, "Call not found");
    }

    const recording = await prisma.callRecording.create({
      data: {
        callId,
        recordingUrl,
        duration,
        fileSize,
        storageProvider: "cloudinary"
      }
    });

    // Update call recording flag
    await prisma.videoCall.update({
      where: { id: callId },
      data: {
        isRecorded: true,
        recordingUrl
      }
    });

    logger.info(`Call recording created: ${recording.id}`, {
      callId,
      fileSize
    });

    return recording;
  } catch (error) {
    logger.error("Failed to create call recording", {
      message: error instanceof Error ? error.message : String(error),
      callId
    });
    throw error;
  }
}

/**
 * Detect missed calls
 */
export async function detectMissedCall(callId: string) {
  try {
    const call = await prisma.videoCall.findUnique({
      where: { id: callId }
    });

    if (!call || call.status !== "RINGING") {
      return null;
    }

    // If call is ringing for more than 60 seconds, mark as missed
    const ringDuration = (new Date().getTime() - call.createdAt.getTime()) / 1000;
    if (ringDuration > 60) {
      const missedCall = await prisma.videoCall.update({
        where: { id: callId },
        data: {
          status: "MISSED",
          rejectionReason: "NO_ANSWER",
          endedAt: new Date()
        }
      });

      return missedCall;
    }

    return null;
  } catch (error) {
    logger.error("Failed to detect missed call", {
      message: error instanceof Error ? error.message : String(error),
      callId
    });
    return null;
  }
}
