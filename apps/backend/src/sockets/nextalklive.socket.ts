import { Server as SocketIOServer, Socket } from "socket.io";
import { redis } from "../config/nextalkredis";
import { prisma } from "../config/nextalkdb";
import { logger } from "../utils/nextalklogger";
import { getStreamViewerCount } from "../services/nextalklivestream.service";

/**
 * Live Streaming WebSocket Events Handler
 * Manages real-time updates for:
 * - Live stream events (start, end, comments)
 * - Stream viewer updates
 * - Stream analytics
 */

export function registerLiveStreamSocket(io: SocketIOServer) {
  const namespace = io.of("/live");

  namespace.on("connection", (socket: Socket) => {
    logger.info(`User connected to live stream namespace: ${socket.id}`);

    /**
     * Event: stream:join
     * Client joins a live stream channel
     */
    socket.on("stream:join", async (data: { streamId: string; userId: string }) => {
      try {
        const { streamId, userId } = data;

        // Validate stream exists
        const stream = await prisma.liveStream.findUnique({
          where: { id: streamId },
          select: { id: true, status: true, agoraChannelId: true }
        });

        if (!stream) {
          socket.emit("error", { message: "Stream not found" });
          return;
        }

        if (stream.status !== "LIVE") {
          socket.emit("error", { message: "Stream is not currently live" });
          return;
        }

        // Join user to stream room
        socket.join(`stream:${streamId}`);
        socket.join(`stream:${streamId}:user:${userId}`);

        // Broadcast user joined to room
        namespace.to(`stream:${streamId}`).emit("stream:viewer-joined", {
          streamId,
          userId,
          timestamp: new Date()
        });

        // Send current viewer count
        const viewerCount = await getStreamViewerCount(streamId);
        namespace.to(`stream:${streamId}`).emit("stream:viewer-count-updated", {
          streamId,
          viewerCount,
          timestamp: new Date()
        });

        socket.emit("stream:joined-success", {
          streamId,
          agoraChannelId: stream.agoraChannelId,
          message: "Successfully joined live stream"
        });

        logger.info(`User joined stream: ${streamId}`, { userId });
      } catch (error) {
        logger.error("Error joining stream", {
          message: error instanceof Error ? error.message : String(error)
        });
        socket.emit("error", { message: "Failed to join stream" });
      }
    });

    /**
     * Event: stream:leave
     * Client leaves a live stream channel
     */
    socket.on("stream:leave", async (data: { streamId: string; userId: string }) => {
      try {
        const { streamId, userId } = data;

        socket.leave(`stream:${streamId}`);
        socket.leave(`stream:${streamId}:user:${userId}`);

        // Broadcast user left
        namespace.to(`stream:${streamId}`).emit("stream:viewer-left", {
          streamId,
          userId,
          timestamp: new Date()
        });

        // Send updated viewer count
        const viewerCount = await getStreamViewerCount(streamId);
        namespace.to(`stream:${streamId}`).emit("stream:viewer-count-updated", {
          streamId,
          viewerCount,
          timestamp: new Date()
        });

        logger.info(`User left stream: ${streamId}`, { userId });
      } catch (error) {
        logger.error("Error leaving stream", {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * Event: stream:comment
     * Viewer sends a comment during live stream
     */
    socket.on(
      "stream:comment",
      async (data: { streamId: string; userId: string; text: string }) => {
        try {
          const { streamId, userId, text } = data;

          // Validate
          if (!text || text.trim().length === 0) {
            socket.emit("error", { message: "Comment cannot be empty" });
            return;
          }

          // Create comment in DB
          const comment = await prisma.liveStreamComment.create({
            data: {
              streamId,
              userId,
              text: text.trim().substring(0, 500)
            }
          });

          // Broadcast comment to all viewers
          namespace.to(`stream:${streamId}`).emit("stream:new-comment", {
            commentId: comment.id,
            streamId,
            userId,
            text: comment.text,
            createdAt: comment.createdAt
          });

          logger.info(`Comment posted on stream: ${streamId}`, {
            userId,
            commentLength: text.length
          });
        } catch (error) {
          logger.error("Error posting stream comment", {
            message: error instanceof Error ? error.message : String(error)
          });
          socket.emit("error", { message: "Failed to post comment" });
        }
      }
    );

    /**
     * Event: stream:react
     * Viewer sends a reaction (emoji) during live stream
     */
    socket.on("stream:react", async (data: { streamId: string; userId: string; emoji: string }) => {
      try {
        const { streamId, userId, emoji } = data;

        // Validate emoji
        if (!emoji || emoji.length > 2) {
          return;
        }

        // Broadcast reaction to all viewers
        namespace.to(`stream:${streamId}`).emit("stream:new-reaction", {
          streamId,
          userId,
          emoji,
          timestamp: new Date()
        });

        logger.debug(`Reaction sent on stream: ${streamId}`, { userId, emoji });
      } catch (error) {
        logger.error("Error sending stream reaction", {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * Event: stream:request-stats
     * Request real-time stream statistics
     */
    socket.on("stream:request-stats", async (data: { streamId: string }) => {
      try {
        const { streamId } = data;

        const stream = await prisma.liveStream.findUnique({
          where: { id: streamId },
          select: {
            id: true,
            viewerCountNow: true,
            peakViewerCount: true,
            totalViews: true,
            status: true,
            startedAt: true
          }
        });

        if (!stream) {
          socket.emit("error", { message: "Stream not found" });
          return;
        }

        const currentViewers = await getStreamViewerCount(streamId);
        const duration = stream.startedAt
          ? Math.floor((new Date().getTime() - stream.startedAt.getTime()) / 1000)
          : 0;

        socket.emit("stream:stats", {
          streamId,
          currentViewers,
          peakViewers: stream.peakViewerCount,
          totalViews: stream.totalViews,
          duration,
          status: stream.status
        });

        logger.debug(`Stats requested for stream: ${streamId}`);
      } catch (error) {
        logger.error("Error retrieving stream stats", {
          message: error instanceof Error ? error.message : String(error)
        });
        socket.emit("error", { message: "Failed to retrieve stats" });
      }
    });

    /**
     * Event: stream:end-notification
     * Broadcaster sends end-of-stream notification
     */
    socket.on("stream:end-broadcast", (data: { streamId: string; message?: string }) => {
      try {
        const { streamId, message } = data;

        namespace.to(`stream:${streamId}`).emit("stream:broadcast-ending", {
          streamId,
          message: message || "Broadcast is ending",
          timestamp: new Date()
        });

        logger.info(`Stream end notification sent: ${streamId}`);
      } catch (error) {
        logger.error("Error sending stream end notification", {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    socket.on("disconnect", () => {
      logger.info(`User disconnected from live stream namespace: ${socket.id}`);
    });
  });
}

/**
 * Video Call WebSocket Events Handler
 * Manages real-time updates for:
 * - Call notifications (incoming call, accept, reject)
 * - Call state updates
 * - Participant status
 */

export function registerVideoCallSocket(io: SocketIOServer) {
  const namespace = io.of("/calls");

  namespace.on("connection", (socket: Socket) => {
    logger.info(`User connected to video call namespace: ${socket.id}`);

    /**
     * Event: call:register
     * User registers their socket for receiving call notifications
     */
    socket.on("call:register", (data: { userId: string }) => {
      try {
        const { userId } = data;
        socket.join(`user:${userId}:calls`);
        logger.info(`User registered for calls: ${userId}`, { socketId: socket.id });
      } catch (error) {
        logger.error("Error registering for calls", {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * Event: call:incoming
     * Notify recipient of incoming call
     */
    socket.on(
      "call:notify-incoming",
      (data: { callId: string; initiatorId: string; recipientId: string; type: string }) => {
        try {
          const { callId, initiatorId, recipientId, type } = data;

          // Send notification only to recipient
          namespace.to(`user:${recipientId}:calls`).emit("call:incoming", {
            callId,
            initiatorId,
            type,
            timestamp: new Date()
          });

          logger.info(`Incoming call notification sent: ${callId}`, {
            from: initiatorId,
            to: recipientId
          });
        } catch (error) {
          logger.error("Error notifying incoming call", {
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    );

    /**
     * Event: call:accepted
     * Notify initiator that call was accepted
     */
    socket.on("call:notify-accepted", (data: { callId: string; initiatorId: string; tokens: any }) => {
      try {
        const { callId, initiatorId, tokens } = data;

        namespace.to(`user:${initiatorId}:calls`).emit("call:accepted", {
          callId,
          tokens
        });

        logger.info(`Call accepted notification sent: ${callId}`, { for: initiatorId });
      } catch (error) {
        logger.error("Error notifying call accepted", {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * Event: call:rejected
     * Notify initiator that call was rejected
     */
    socket.on("call:notify-rejected", (data: { callId: string; initiatorId: string; reason: string }) => {
      try {
        const { callId, initiatorId, reason } = data;

        namespace.to(`user:${initiatorId}:calls`).emit("call:rejected", {
          callId,
          reason,
          timestamp: new Date()
        });

        logger.info(`Call rejected notification sent: ${callId}`, { for: initiatorId });
      } catch (error) {
        logger.error("Error notifying call rejected", {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * Event: call:ended
     * Notify all participants that call ended
     */
    socket.on(
      "call:notify-ended",
      (data: { callId: string; endedBy: string; duration: number; userIds: string[] }) => {
        try {
          const { callId, endedBy, duration, userIds } = data;

          userIds.forEach((userId) => {
            namespace.to(`user:${userId}:calls`).emit("call:ended", {
              callId,
              endedBy,
              duration,
              timestamp: new Date()
            });
          });

          logger.info(`Call ended notification sent: ${callId}`, { endedBy, duration });
        } catch (error) {
          logger.error("Error notifying call ended", {
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    );

    /**
     * Event: call:participant-update
     * Notify others of participant state change (mute, video off, etc.)
     */
    socket.on(
      "call:participant-update",
      (data: { callId: string; userId: string; state: any; userIds: string[] }) => {
        try {
          const { callId, userId, state, userIds } = data;

          userIds.forEach((id) => {
            if (id !== userId) {
              namespace.to(`user:${id}:calls`).emit("call:participant-state-changed", {
                callId,
                userId,
                state,
                timestamp: new Date()
              });
            }
          });

          logger.debug(`Participant update notified: ${callId}`, { userId });
        } catch (error) {
          logger.error("Error notifying participant update", {
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    );

    socket.on("disconnect", () => {
      logger.info(`User disconnected from video call namespace: ${socket.id}`);
    });
  });
}
