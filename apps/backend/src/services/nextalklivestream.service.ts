import { prisma } from "../config/nextalkdb";
import { redis } from "../config/nextalkredis";
import { ApiError } from "../utils/nextalkapierror";
import { generateAgoraToken } from "./nextalkagora.service";
import { logger } from "../utils/nextalklogger";
import { writeAuditLog } from "./nextalkaudit.service";

/**
 * Live Streaming Service
 * Manages live stream lifecycle, viewers, and real-time interactions
 */

interface CreateLiveStreamInput {
  broadcasterId: string;
  title: string;
  description?: string;
  visibility?: "PUBLIC" | "PRIVATE" | "SEMI_PRIVATE";
  allowComments?: boolean;
  categoryId?: string;
  tags?: string[];
  scheduledAt?: Date;
}

interface UpdateLiveStreamInput {
  title?: string;
  description?: string;
  visibility?: "PUBLIC" | "PRIVATE" | "SEMI_PRIVATE";
  allowComments?: boolean;
}

/**
 * Create a new live stream
 */
export async function createLiveStream(input: CreateLiveStreamInput) {
  try {
    // Validate broadcaster exists
    const broadcaster = await prisma.user.findUnique({
      where: { id: input.broadcasterId },
      select: { id: true, planTier: true }
    });

    if (!broadcaster) {
      throw new ApiError(404, "Broadcaster not found");
    }

    // Check freemium limits for non-premium users
    if (broadcaster.planTier === "FREE") {
      const activeLiveStreams = await prisma.liveStream.count({
        where: {
          broadcasterId: input.broadcasterId,
          status: "LIVE"
        }
      });

      if (activeLiveStreams > 0) {
        throw new ApiError(403, "Free tier limited to 1 concurrent live stream");
      }
    }

    // Generate Agora channel ID
    const agoraChannelId = `stream_${input.broadcasterId}_${Date.now()}`;

    const liveStream = await prisma.liveStream.create({
      data: {
        broadcasterId: input.broadcasterId,
        title: input.title,
        description: input.description,
        visibility: input.visibility || "PUBLIC",
        allowComments: input.allowComments !== false,
        categoryId: input.categoryId,
        tags: input.tags || [],
        agoraChannelId,
        scheduledAt: input.scheduledAt,
        status: input.scheduledAt ? "SCHEDULED" : "LIVE",
        startedAt: input.scheduledAt ? null : new Date()
      },
      include: {
        broadcaster: {
          select: { id: true, username: true, profile: { select: { displayName: true, profileImageUrl: true } } }
        }
      }
    });

    // Cache stream info
    await redis.setex(
      `stream:${liveStream.id}`,
      3600,
      JSON.stringify({
        id: liveStream.id,
        broadcasterId: liveStream.broadcasterId,
        status: liveStream.status,
        viewerCount: 0
      })
    );

    // Log action
    await writeAuditLog({
      userId: input.broadcasterId,
      action: "LIVE_STREAM_CREATED",
      method: "POST",
      path: "/live/streams",
      statusCode: 201,
      metadata: { streamId: liveStream.id, title: liveStream.title }
    });

    logger.info(`Live stream created: ${liveStream.id}`, { broadcasterId: input.broadcasterId });

    return liveStream;
  } catch (error) {
    logger.error("Failed to create live stream", {
      message: error instanceof Error ? error.message : String(error),
      broadcasterId: input.broadcasterId
    });
    throw error;
  }
}

/**
 * Start a live stream (transition from SCHEDULED to LIVE)
 */
export async function startLiveStream(streamId: string, broadcasterId: string) {
  try {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId }
    });

    if (!stream) {
      throw new ApiError(404, "Live stream not found");
    }

    if (stream.broadcasterId !== broadcasterId) {
      throw new ApiError(403, "Unauthorized to start this stream");
    }

    if (stream.status !== "SCHEDULED" && stream.status !== "LIVE") {
      throw new ApiError(400, `Cannot start stream with status: ${stream.status}`);
    }

    const updatedStream = await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        status: "LIVE",
        startedAt: new Date()
      }
    });

    // Update cache
    await redis.setex(
      `stream:${streamId}:status`,
      3600,
      "LIVE"
    );

    await writeAuditLog({
      userId: broadcasterId,
      action: "LIVE_STREAM_STARTED",
      method: "POST",
      path: `/live/streams/${streamId}/start`,
      statusCode: 200,
      metadata: { streamId }
    });

    logger.info(`Live stream started: ${streamId}`, { broadcasterId });

    return updatedStream;
  } catch (error) {
    logger.error("Failed to start live stream", {
      message: error instanceof Error ? error.message : String(error),
      streamId
    });
    throw error;
  }
}

/**
 * End a live stream
 */
export async function endLiveStream(streamId: string, broadcasterId: string) {
  try {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: { viewers: true }
    });

    if (!stream) {
      throw new ApiError(404, "Live stream not found");
    }

    if (stream.broadcasterId !== broadcasterId) {
      throw new ApiError(403, "Unauthorized to end this stream");
    }

    if (stream.status !== "LIVE") {
      throw new ApiError(400, `Cannot end stream with status: ${stream.status}`);
    }

    const endedAt = new Date();
    const startedAt = stream.startedAt;
    const duration = startedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : 0;

    const updatedStream = await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        status: "ENDED",
        endedAt,
        duration,
        viewerCountNow: 0
      }
    });

    // Clean up cache
    await redis.del(`stream:${streamId}`);
    await redis.del(`stream:${streamId}:status`);
    await redis.del(`stream:${streamId}:viewers`);

    await writeAuditLog({
      userId: broadcasterId,
      action: "LIVE_STREAM_ENDED",
      method: "POST",
      path: `/live/streams/${streamId}/end`,
      statusCode: 200,
      metadata: { streamId, duration, viewerCount: stream.viewers.length }
    });

    logger.info(`Live stream ended: ${streamId}`, { broadcasterId, duration });

    return updatedStream;
  } catch (error) {
    logger.error("Failed to end live stream", {
      message: error instanceof Error ? error.message : String(error),
      streamId
    });
    throw error;
  }
}

/**
 * Add viewer to live stream
 */
export async function joinLiveStream(streamId: string, viewerId: string) {
  try {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { id: true, status: true, broadcasterId: true }
    });

    if (!stream) {
      throw new ApiError(404, "Live stream not found");
    }

    if (stream.status !== "LIVE") {
      throw new ApiError(400, "Stream is not currently live");
    }

    // Check if already viewing
    const existingViewer = await prisma.liveStreamViewer.findUnique({
      where: {
        streamId_viewerId: { streamId, viewerId }
      }
    });

    if (!existingViewer) {
      await prisma.liveStreamViewer.create({
        data: {
          streamId,
          viewerId
        }
      });

      // Update viewer count in cache
      const viewerKey = `stream:${streamId}:viewers`;
      const currentCount = await redis.incr(viewerKey);
      await redis.expire(viewerKey, 3600);

      // Update peak viewers if needed
      const peakViewers = await prisma.liveStream.findUnique({
        where: { id: streamId },
        select: { peakViewerCount: true }
      });

      if (peakViewers && currentCount > peakViewers.peakViewerCount) {
        await prisma.liveStream.update({
          where: { id: streamId },
          data: {
            peakViewerCount: currentCount,
            viewerCountNow: currentCount
          }
        });
      }

      // Increment total views
      await prisma.liveStream.update({
        where: { id: streamId },
        data: { totalViews: { increment: 1 } }
      });
    }

    // Generate Agora token for viewer
    const token = await generateAgoraToken(stream.id, viewerId, 0);

    return {
      streamId,
      viewerId,
      token,
      agoraChannelId: stream.id
    };
  } catch (error) {
    logger.error("Failed to join live stream", {
      message: error instanceof Error ? error.message : String(error),
      streamId,
      viewerId
    });
    throw error;
  }
}

/**
 * Remove viewer from live stream
 */
export async function leaveLiveStream(streamId: string, viewerId: string) {
  try {
    const viewer = await prisma.liveStreamViewer.findUnique({
      where: {
        streamId_viewerId: { streamId, viewerId }
      }
    });

    if (viewer && !viewer.leftAt) {
      // Calculate watched duration
      const watchedDuration = Math.floor(
        (new Date().getTime() - viewer.joinedAt.getTime()) / 1000
      );

      await prisma.liveStreamViewer.update({
        where: { id: viewer.id },
        data: {
          leftAt: new Date(),
          watchedDuration
        }
      });

      // Decrement viewer count
      await redis.decr(`stream:${streamId}:viewers`);

      // Update stream viewer count
      const viewerCount = await redis.get(`stream:${streamId}:viewers`);
      if (viewerCount !== null) {
        await prisma.liveStream.update({
          where: { id: streamId },
          data: { viewerCountNow: Math.max(0, parseInt(viewerCount)) }
        });
      }
    }

    return { success: true };
  } catch (error) {
    logger.error("Failed to leave live stream", {
      message: error instanceof Error ? error.message : String(error),
      streamId,
      viewerId
    });
    throw error;
  }
}

/**
 * Get live stream details
 */
export async function getLiveStream(streamId: string) {
  try {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: {
        broadcaster: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, profileImageUrl: true }
            }
          }
        },
        viewers: {
          select: { viewerId: true, joinedAt: true }
        }
      }
    });

    if (!stream) {
      throw new ApiError(404, "Live stream not found");
    }

    return stream;
  } catch (error) {
    logger.error("Failed to get live stream", {
      message: error instanceof Error ? error.message : String(error),
      streamId
    });
    throw error;
  }
}

/**
 * Get active live streams (paginated)
 */
export async function getActiveLiveStreams(limit: number = 20, offset: number = 0) {
  try {
    const streams = await prisma.liveStream.findMany({
      where: {
        status: "LIVE",
        visibility: { in: ["PUBLIC", "SEMI_PRIVATE"] }
      },
      include: {
        broadcaster: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, profileImageUrl: true }
            }
          }
        }
      },
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset
    });

    const total = await prisma.liveStream.count({
      where: {
        status: "LIVE",
        visibility: { in: ["PUBLIC", "SEMI_PRIVATE"] }
      }
    });

    return {
      streams,
      total,
      limit,
      offset
    };
  } catch (error) {
    logger.error("Failed to get active live streams", {
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Get broadcaster's live stream history
 */
export async function getBroadcasterLiveStreams(broadcasterId: string, limit: number = 20, offset: number = 0) {
  try {
    const streams = await prisma.liveStream.findMany({
      where: { broadcasterId },
      include: {
        broadcaster: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, profileImageUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    });

    const total = await prisma.liveStream.count({
      where: { broadcasterId }
    });

    return {
      streams,
      total,
      limit,
      offset
    };
  } catch (error) {
    logger.error("Failed to get broadcaster live streams", {
      message: error instanceof Error ? error.message : String(error),
      broadcasterId
    });
    throw error;
  }
}

/**
 * Update live stream info
 */
export async function updateLiveStream(
  streamId: string,
  broadcasterId: string,
  input: UpdateLiveStreamInput
) {
  try {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId }
    });

    if (!stream) {
      throw new ApiError(404, "Live stream not found");
    }

    if (stream.broadcasterId !== broadcasterId) {
      throw new ApiError(403, "Unauthorized to update this stream");
    }

    const updatedStream = await prisma.liveStream.update({
      where: { id: streamId },
      data: input
    });

    return updatedStream;
  } catch (error) {
    logger.error("Failed to update live stream", {
      message: error instanceof Error ? error.message : String(error),
      streamId
    });
    throw error;
  }
}

/**
 * Get viewer count for a stream
 */
export async function getStreamViewerCount(streamId: string): Promise<number> {
  try {
    const cached = await redis.get(`stream:${streamId}:viewers`);
    if (cached) {
      return parseInt(cached);
    }

    // If not cached, count from database
    const count = await prisma.liveStreamViewer.count({
      where: {
        streamId,
        leftAt: null
      }
    });

    await redis.setex(`stream:${streamId}:viewers`, 300, String(count));
    return count;
  } catch (error) {
    logger.error("Failed to get stream viewer count", {
      message: error instanceof Error ? error.message : String(error),
      streamId
    });
    return 0;
  }
}
