import { Server, Socket } from "socket.io";
import { MessageType } from "@prisma/client";
import { saveMessage } from "../services/message.service";

type CallPayload = {
  callId: string;
  chatId: string;
  fromUserId: string;
  toUserIds: string[];
  mode: "audio" | "video";
};

export function registerChatSocket(io: Server) {
  const onlineUsers = new Map<string, string>();

  io.on("connection", (socket: Socket) => {
    socket.on("presence:online", (userId: string) => {
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
      io.emit("presence:update", { userId, status: "online" });
    });

    socket.on("presence:heartbeat", (userId: string) => {
      if (userId) {
        onlineUsers.set(userId, socket.id);
      }
    });

    socket.on("join_chat", (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on("leave_chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on("join_match", (matchId: string) => {
      socket.join(`chat:${matchId}`);
    });

    socket.on("typing:start", (payload: { chatId?: string; matchId?: string; userId: string }) => {
      const room = payload.chatId ?? payload.matchId;
      if (!room) {
        return;
      }
      socket.to(`chat:${room}`).emit("typing:update", {
        userId: payload.userId,
        chatId: room,
        isTyping: true
      });
    });

    socket.on("typing:stop", (payload: { chatId?: string; matchId?: string; userId: string }) => {
      const room = payload.chatId ?? payload.matchId;
      if (!room) {
        return;
      }
      socket.to(`chat:${room}`).emit("typing:update", {
        userId: payload.userId,
        chatId: room,
        isTyping: false
      });
    });

    socket.on("recording:start", (payload: { chatId: string; userId: string }) => {
      socket.to(`chat:${payload.chatId}`).emit("recording:update", {
        userId: payload.userId,
        chatId: payload.chatId,
        isRecording: true
      });
    });

    socket.on("recording:stop", (payload: { chatId: string; userId: string }) => {
      socket.to(`chat:${payload.chatId}`).emit("recording:update", {
        userId: payload.userId,
        chatId: payload.chatId,
        isRecording: false
      });
    });

    socket.on(
      "send_message",
      async (payload: {
        chatId?: string;
        matchId?: string;
        senderId: string;
        planTier: "FREE" | "PREMIUM";
        type: MessageType;
        text?: string;
        mediaUrl?: string;
      }) => {
        try {
          const roomId = payload.chatId ?? payload.matchId;
          if (!roomId) {
            throw new Error("chatId requis");
          }
          const message = await saveMessage({
            matchId: roomId,
            senderId: payload.senderId,
            planTier: payload.planTier,
            type: payload.type,
            text: payload.text,
            mediaUrl: payload.mediaUrl
          });
          io.to(`chat:${roomId}`).emit("new_message", message);
        } catch (error) {
          socket.emit("message_error", {
            message: error instanceof Error ? error.message : "Erreur envoi message"
          });
        }
      }
    );

    socket.on("message:read", (payload: { chatId?: string; matchId?: string; messageId: string; readerId: string }) => {
      const room = payload.chatId ?? payload.matchId;
      if (!room) {
        return;
      }
      io.to(`chat:${room}`).emit("message:read:update", { ...payload, chatId: room });
    });

    socket.on("message:reaction", (payload: { chatId: string; messageId: string; userId: string; emoji: string }) => {
      io.to(`chat:${payload.chatId}`).emit("message:reaction:update", payload);
    });

    socket.on("call:start", (payload: CallPayload) => {
      for (const userId of payload.toUserIds) {
        io.to(`user:${userId}`).emit("call:incoming", payload);
      }
    });

    socket.on(
      "call:signal",
      (payload: {
        callId: string;
        toUserId: string;
        fromUserId: string;
        description?: Record<string, unknown>;
        candidate?: Record<string, unknown>;
      }) => {
        io.to(`user:${payload.toUserId}`).emit("call:signal", payload);
      }
    );

    socket.on("call:accepted", (payload: { callId: string; fromUserId: string; toUserId: string }) => {
      io.to(`user:${payload.toUserId}`).emit("call:accepted", payload);
    });

    socket.on("call:declined", (payload: { callId: string; fromUserId: string; toUserId: string }) => {
      io.to(`user:${payload.toUserId}`).emit("call:declined", payload);
    });

    socket.on("call:end", (payload: { callId: string; targetUserIds: string[] }) => {
      for (const userId of payload.targetUserIds) {
        io.to(`user:${userId}`).emit("call:ended", payload);
      }
    });

    socket.on("disconnect", () => {
      const offlineUser = [...onlineUsers.entries()].find(([, socketId]) => socketId === socket.id)?.[0];
      if (offlineUser) {
        onlineUsers.delete(offlineUser);
        io.emit("presence:update", { userId: offlineUser, status: "offline" });
      }
    });
  });
}
