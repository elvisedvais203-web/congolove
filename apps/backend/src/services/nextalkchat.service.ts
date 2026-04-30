import { ChatKind, ChatMemberRole, MessageType, Prisma } from "@prisma/client";
import { prisma } from "../config/nextalkdb";
import { checkMessageSpam } from "./nextalkspam-detection.service";
import { canSendMessage } from "./nextalkmessage.service";
import { ApiError } from "../utils/nextalkapierror";
import { writeAuditLog } from "./nextalkaudit.service";

const ONLINE_WINDOW_MS = 45_000;

type ConversationQuery = {
  q?: string;
  archived?: boolean;
};

type MessageQuery = {
  q?: string;
  cursor?: number;
  limit?: number;
};

function nowMinusOnlineWindow() {
  return new Date(Date.now() - ONLINE_WINDOW_MS);
}

function ensureProfileUpdate(userId: string) {
  return prisma.profile.updateMany({
    where: { userId },
    data: { lastActiveAt: new Date() }
  });
}

function chatInclude(currentUserId: string) {
  return {
    members: {
      include: {
        user: {
          include: {
            profile: true,
            photos: { where: { isPrimary: true }, take: 1 }
          }
        }
      }
    },
    messages: {
      orderBy: { createdAt: "desc" as const },
      take: 1,
      include: {
        reactions: true
      }
    },
    _count: {
      select: {
        members: true
      }
    }
  } satisfies Prisma.ChatInclude;
}

async function ensureChatMember(chatId: string, userId: string) {
  const member = await prisma.chatMember.findUnique({
    where: {
      chatId_userId: { chatId, userId }
    },
    include: {
      chat: {
        include: chatInclude(userId)
      }
    }
  });

  if (!member) {
    throw new ApiError(404, "Conversation introuvable");
  }

  return member;
}

async function getUnreadCount(chatId: string, userId: string) {
  return prisma.chatMessageReceipt.count({
    where: {
      userId,
      readAt: null,
      message: {
        chatId,
        senderId: { not: userId }
      }
    }
  });
}

function mapConversation(chat: Prisma.ChatGetPayload<{ include: ReturnType<typeof chatInclude> }>, currentUserId: string, unreadCount: number) {
  const lastMessage = chat.messages[0] ?? null;
  const isPrivate = chat.kind === ChatKind.PRIVATE;
  const counterpart = isPrivate ? chat.members.find((member) => member.userId !== currentUserId)?.user ?? null : null;

  return {
    id: chat.id,
    kind: chat.kind,
    title: isPrivate ? counterpart?.profile?.displayName ?? chat.title ?? "Conversation" : chat.title ?? "Groupe",
    avatarUrl: isPrivate ? counterpart?.photos[0]?.url ?? null : chat.avatarUrl ?? null,
    memberCount: chat._count.members,
    members: chat.members.map((member) => ({
      id: member.user.id,
      displayName: member.user.profile?.displayName ?? member.user.phone,
      city: member.user.profile?.city ?? undefined,
      avatarUrl: member.user.photos[0]?.url ?? null,
      online: Boolean(member.user.profile?.lastActiveAt && member.user.profile.lastActiveAt >= nowMinusOnlineWindow()),
      role: member.user.role
    })),
    adminIds: chat.members.filter((member) => member.role === ChatMemberRole.ADMIN).map((member) => member.userId),
    archived: Boolean(chat.members.find((member) => member.userId === currentUserId)?.archivedAt),
    unreadCount,
    online: Boolean(counterpart?.profile?.lastActiveAt && counterpart.profile.lastActiveAt >= nowMinusOnlineWindow()),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          text: lastMessage.deletedAt ? "Message supprime" : lastMessage.text ?? undefined,
          type: lastMessage.type,
          createdAt: lastMessage.createdAt,
          senderId: lastMessage.senderId,
          reactions: lastMessage.reactions.map((reaction) => ({ emoji: reaction.emoji, userId: reaction.userId }))
        }
      : null
  };
}

function mapMessage(
  message: Prisma.ChatMessageGetPayload<{
    include: {
      sender: { include: { profile: true; photos: true } };
      receipts: true;
      reactions: true;
      replyTo: {
        include: { sender: { include: { profile: true; photos: true } } };
      };
    };
  }>,
  currentUserId: string
) {
  const anyRead = message.receipts.some((receipt) => receipt.readAt);
  const anyDelivered = message.receipts.length > 0;
  const lastDeliveredAt = message.receipts.reduce<Date | null>((acc, receipt) => {
    if (!receipt.deliveredAt) return acc;
    return acc ? (receipt.deliveredAt > acc ? receipt.deliveredAt : acc) : receipt.deliveredAt;
  }, null);
  const lastReadAt = message.receipts.reduce<Date | null>((acc, receipt) => {
    if (!receipt.readAt) return acc;
    return acc ? (receipt.readAt > acc ? receipt.readAt : acc) : receipt.readAt;
  }, null);

  return {
    id: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          senderId: message.replyTo.senderId,
          type: message.replyTo.type,
          text: message.replyTo.deletedAt ? "Message supprime" : message.replyTo.text ?? undefined,
          createdAt: message.replyTo.createdAt,
          sender: {
            id: message.replyTo.sender.id,
            displayName: message.replyTo.sender.profile?.displayName ?? message.replyTo.sender.phone,
            avatarUrl: message.replyTo.sender.photos.find((photo) => photo.isPrimary)?.url ?? null
          }
        }
      : null,
    type: message.type,
    text: message.deletedAt ? "Message supprime" : message.text ?? undefined,
    mediaUrl: message.deletedAt ? undefined : message.mediaUrl ?? undefined,
    fileName: message.deletedAt ? undefined : message.fileName ?? undefined,
    durationSec: message.durationSec ?? undefined,
    isRead: anyRead,
    deliveredTo: message.receipts.map((receipt) => receipt.userId),
    readBy: message.receipts.filter((receipt) => receipt.readAt).map((receipt) => receipt.userId),
    reactions: message.reactions.map((reaction) => ({ emoji: reaction.emoji, userId: reaction.userId })),
    lastDeliveredAt: lastDeliveredAt ?? undefined,
    lastReadAt: lastReadAt ?? undefined,
    editedAt: message.editedAt ?? undefined,
    deletedAt: message.deletedAt ?? undefined,
    createdAt: message.createdAt,
    sender: {
      id: message.sender.id,
      displayName: message.sender.profile?.displayName ?? message.sender.phone,
      avatarUrl: message.sender.photos.find((photo) => photo.isPrimary)?.url ?? null
    },
    status:
      message.senderId !== currentUserId
        ? "received"
        : anyRead
          ? "read"
          : anyDelivered
            ? "delivered"
            : "sent"
  };
}

export async function findOrCreatePrivateChat(userAId: string, userBId: string) {
  const existing = await prisma.chat.findFirst({
    where: {
      kind: ChatKind.PRIVATE,
      members: {
        every: {
          userId: { in: [userAId, userBId] }
        }
      }
    },
    include: chatInclude(userAId)
  });

  if (existing && existing.members.length === 2) {
    return existing;
  }

  return prisma.chat.create({
    data: {
      kind: ChatKind.PRIVATE,
      members: {
        create: [
          { userId: userAId, role: ChatMemberRole.ADMIN },
          { userId: userBId, role: ChatMemberRole.ADMIN }
        ]
      }
    },
    include: chatInclude(userAId)
  });
}

export async function listConversations(userId: string, query: ConversationQuery) {
  await ensureProfileUpdate(userId);

  const rows = await prisma.chat.findMany({
    where: {
      members: {
        some: {
          userId,
          archivedAt: query.archived ? { not: null } : null
        }
      },
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { messages: { some: { text: { contains: query.q, mode: "insensitive" } } } },
              {
                members: {
                  some: {
                    user: {
                      is: {
                        profile: {
                          is: {
                            displayName: { contains: query.q, mode: "insensitive" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            ]
          }
        : {})
    },
    include: chatInclude(userId),
    orderBy: { updatedAt: "desc" }
  });

  const mapped = await Promise.all(
    rows.map(async (chat) => mapConversation(chat, userId, await getUnreadCount(chat.id, userId)))
  );

  return mapped.sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });
}

export async function getConversation(userId: string, chatId: string) {
  const member = await ensureChatMember(chatId, userId);
  return mapConversation(member.chat, userId, await getUnreadCount(chatId, userId));
}

export async function listChatMessages(userId: string, chatId: string, query: MessageQuery) {
  await ensureChatMember(chatId, userId);

  const messages = await prisma.chatMessage.findMany({
    where: {
      chatId,
      ...(query.q ? { text: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {})
    },
    include: {
      sender: {
        include: {
          profile: true,
          photos: true
        }
      },
      replyTo: {
        include: {
          sender: { include: { profile: true, photos: true } }
        }
      },
      receipts: true,
      reactions: true
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(query.limit ?? 40, 80)
  });

  const items = messages.reverse().map((message) => mapMessage(message, userId));
  const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt.getTime() : null;
  const chat = await getConversation(userId, chatId);
  return { items, nextCursor, chat };
}

export async function searchMessagesInChat(userId: string, chatId: string, q: string) {
  await ensureChatMember(chatId, userId);
  const rows = await prisma.chatMessage.findMany({
    where: {
      chatId,
      text: { contains: q, mode: "insensitive" }
    },
    include: {
      sender: { include: { profile: true, photos: true } },
      replyTo: { include: { sender: { include: { profile: true, photos: true } } } },
      receipts: true,
      reactions: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return rows.map((message) => mapMessage(message, userId));
}

export async function createGroupChat(userId: string, payload: { title: string; avatarUrl?: string; memberIds: string[] }) {
  const ids = [...new Set([userId, ...payload.memberIds])];
  const chat = await prisma.chat.create({
    data: {
      kind: ChatKind.GROUP,
      title: payload.title,
      avatarUrl: payload.avatarUrl,
      members: {
        create: ids.map((id) => ({ userId: id, role: id === userId ? ChatMemberRole.ADMIN : ChatMemberRole.MEMBER }))
      }
    },
    include: chatInclude(userId)
  });
  return mapConversation(chat, userId, 0);
}

export async function addGroupMember(userId: string, chatId: string, memberId: string) {
  const actor = await prisma.chatMember.findUnique({ where: { chatId_userId: { chatId, userId } } });
  if (!actor || actor.role !== ChatMemberRole.ADMIN) {
    throw new ApiError(403, "Action reservee aux admins du groupe");
  }
  await prisma.chatMember.upsert({
    where: { chatId_userId: { chatId, userId: memberId } },
    update: { archivedAt: null },
    create: { chatId, userId: memberId, role: ChatMemberRole.MEMBER }
  });
  return getConversation(userId, chatId);
}

export async function removeGroupMember(userId: string, chatId: string, memberId: string) {
  const actor = await prisma.chatMember.findUnique({ where: { chatId_userId: { chatId, userId } } });
  if (!actor || actor.role !== ChatMemberRole.ADMIN) {
    throw new ApiError(403, "Action reservee aux admins du groupe");
  }
  await prisma.chatMember.deleteMany({ where: { chatId, userId: memberId } });
  return getConversation(userId, chatId);
}

export async function sendChatMessage(
  userId: string,
  payload: {
    chatId: string;
    type: MessageType;
    text?: string;
    mediaUrl?: string;
    fileName?: string;
    durationSec?: number;
    replyToMessageId?: string;
    planTier: "FREE" | "PREMIUM";
  }
) {
  const member = await ensureChatMember(payload.chatId, userId);
  const usageCheck = await canSendMessage(userId, payload.planTier);
  if (!usageCheck.allowed) {
    throw new ApiError(429, `Limite de messages atteinte (${usageCheck.limit}/jour)`);
  }

  const spamCheck = await checkMessageSpam(userId, payload.text);
  if (spamCheck.blocked) {
    await writeAuditLog({
      userId,
      action: "MESSAGE_BLOCKED_SPAM",
      method: "CHAT_SEND",
      path: `/chats/${payload.chatId}/messages`,
      statusCode: 400,
      metadata: {
        reason: spamCheck.reason ?? "spam",
        type: payload.type,
        hasText: Boolean(payload.text),
        hasMedia: Boolean(payload.mediaUrl)
      }
    });
    throw new ApiError(400, spamCheck.reason ?? "Message bloque");
  }

  const recipients = member.chat.members.filter((item) => item.userId !== userId).map((item) => item.userId);

  let replyToId: string | undefined;
  if (payload.replyToMessageId) {
    const parent = await prisma.chatMessage.findFirst({
      where: {
        id: payload.replyToMessageId,
        chatId: payload.chatId
      },
      select: { id: true }
    });
    if (!parent) {
      throw new ApiError(400, "Message de réponse introuvable");
    }
    replyToId = parent.id;
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.chatMessage.create({
      data: {
        chatId: payload.chatId,
        senderId: userId,
        replyToId,
        type: payload.type,
        text: payload.text,
        mediaUrl: payload.mediaUrl,
        fileName: payload.fileName,
        durationSec: payload.durationSec,
        receipts: {
          create: recipients.map((recipientId) => ({ userId: recipientId }))
        }
      },
      include: {
        sender: { include: { profile: true, photos: true } },
        replyTo: { include: { sender: { include: { profile: true, photos: true } } } },
        receipts: true,
        reactions: true
      }
    });

    await tx.chat.update({ where: { id: payload.chatId }, data: { updatedAt: new Date() } });
    return created;
  });

  return mapMessage(message, userId);
}

export async function markChatRead(userId: string, chatId: string) {
  await ensureChatMember(chatId, userId);
  const now = new Date();
  const update = await prisma.chatMessageReceipt.updateMany({
    where: {
      userId,
      readAt: null,
      message: {
        chatId,
        senderId: { not: userId }
      }
    },
    data: { readAt: now }
  });

  await prisma.chatMember.update({
    where: { chatId_userId: { chatId, userId } },
    data: { lastReadAt: now, archivedAt: null }
  });

  return { ok: true, updated: update.count };
}

export async function archiveConversation(userId: string, chatId: string, archived: boolean) {
  await prisma.chatMember.update({
    where: { chatId_userId: { chatId, userId } },
    data: { archivedAt: archived ? new Date() : null }
  });
  return getConversation(userId, chatId);
}

export async function clearAllConversations(userId: string) {
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    select: { chatId: true }
  });
  const chatIds = memberships.map((item) => item.chatId);

  if (chatIds.length === 0) {
    return { ok: true, chats: 0, messagesCleared: 0, archived: 0 };
  }

  const now = new Date();
  const [messagesCleared, archived] = await prisma.$transaction([
    prisma.chatMessage.updateMany({
      where: {
        chatId: { in: chatIds },
        senderId: userId,
        deletedAt: null
      },
      data: {
        text: null,
        mediaUrl: null,
        fileName: null,
        durationSec: null,
        deletedAt: now,
        editedAt: now
      }
    }),
    prisma.chatMember.updateMany({
      where: { userId, chatId: { in: chatIds } },
      data: { archivedAt: now, lastReadAt: now }
    })
  ]);

  return {
    ok: true,
    chats: chatIds.length,
    messagesCleared: messagesCleared.count,
    archived: archived.count
  };
}

export async function deleteAllConversations(userId: string) {
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    select: { chatId: true }
  });
  const chatIds = memberships.map((item) => item.chatId);

  if (chatIds.length === 0) {
    return { ok: true, chatsRemoved: 0, membershipsRemoved: 0, reactionsRemoved: 0, orphanChatsRemoved: 0 };
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.chatMessage.updateMany({
      where: {
        chatId: { in: chatIds },
        senderId: userId,
        deletedAt: null
      },
      data: {
        text: null,
        mediaUrl: null,
        fileName: null,
        durationSec: null,
        deletedAt: now,
        editedAt: now
      }
    });

    const reactionsRemoved = await tx.chatReaction.deleteMany({
      where: {
        userId,
        message: {
          chatId: { in: chatIds }
        }
      }
    });

    const membershipsRemoved = await tx.chatMember.deleteMany({
      where: { userId, chatId: { in: chatIds } }
    });

    const orphanChats = await tx.chat.findMany({
      where: {
        id: { in: chatIds },
        members: { none: {} }
      },
      select: { id: true }
    });

    const orphanChatsRemoved = orphanChats.length
      ? await tx.chat.deleteMany({ where: { id: { in: orphanChats.map((item) => item.id) } } })
      : { count: 0 };

    return {
      membershipsRemoved: membershipsRemoved.count,
      reactionsRemoved: reactionsRemoved.count,
      orphanChatsRemoved: orphanChatsRemoved.count
    };
  });

  return {
    ok: true,
    chatsRemoved: chatIds.length,
    membershipsRemoved: result.membershipsRemoved,
    reactionsRemoved: result.reactionsRemoved,
    orphanChatsRemoved: result.orphanChatsRemoved
  };
}

export async function editChatMessage(userId: string, messageId: string, text: string) {
  const existing = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!existing || existing.senderId !== userId) {
    throw new ApiError(404, "Message introuvable");
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { text, editedAt: new Date() },
    include: {
      sender: { include: { profile: true, photos: true } },
      replyTo: { include: { sender: { include: { profile: true, photos: true } } } },
      receipts: true,
      reactions: true
    }
  });
  return mapMessage(updated, userId);
}

export async function deleteChatMessage(userId: string, messageId: string) {
  const existing = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!existing || existing.senderId !== userId) {
    throw new ApiError(404, "Message introuvable");
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      text: null,
      mediaUrl: null,
      fileName: null,
      durationSec: null,
      deletedAt: new Date()
    },
    include: {
      sender: { include: { profile: true, photos: true } },
      replyTo: { include: { sender: { include: { profile: true, photos: true } } } },
      receipts: true,
      reactions: true
    }
  });
  return mapMessage(updated, userId);
}

export async function toggleReaction(userId: string, messageId: string, emoji: string) {
  const existing = await prisma.chatReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji
      }
    }
  });

  if (existing) {
    await prisma.chatReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.chatReaction.create({ data: { messageId, userId, emoji } });
  }

  const updated = await prisma.chatMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: {
      sender: { include: { profile: true, photos: true } },
      replyTo: { include: { sender: { include: { profile: true, photos: true } } } },
      receipts: true,
      reactions: true
    }
  });
  return mapMessage(updated, userId);
}

export async function listPresence(userId: string) {
  await ensureProfileUpdate(userId);
  const profiles = await prisma.profile.findMany({
    where: { userId: { not: userId } },
    select: { userId: true, lastActiveAt: true }
  });

  return profiles.map((profile) => ({
    userId: profile.userId,
    status: profile.lastActiveAt >= nowMinusOnlineWindow() ? "online" : "offline",
    lastSeenAt: profile.lastActiveAt
  }));
}

export async function pingPresence(userId: string) {
  await ensureProfileUpdate(userId);
  return { ok: true, ts: new Date().toISOString() };
}

export async function globalSearch(userId: string, q: string, limit: number) {
  await ensureProfileUpdate(userId);
  const take = Math.min(limit, 20);

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { profile: { is: { displayName: { contains: q, mode: "insensitive" } } } },
        { profile: { is: { city: { contains: q, mode: "insensitive" } } } },
        { profile: { is: { bio: { contains: q, mode: "insensitive" } } } }
      ]
    },
    include: { profile: true, photos: { where: { isPrimary: true }, take: 1 } },
    take
  });

  const userResults = await Promise.all(
    users.map(async (user) => {
      const chat = await findOrCreatePrivateChat(userId, user.id);
      return {
        id: user.id,
        chatId: chat.id,
        displayName: user.profile?.displayName ?? user.phone,
        city: user.profile?.city ?? undefined,
        avatarUrl: user.photos[0]?.url ?? null,
        role: user.role
      };
    })
  );

  const messages = await prisma.chatMessage.findMany({
    where: {
      text: { contains: q, mode: "insensitive" },
      chat: { members: { some: { userId } } }
    },
    include: { chat: true },
    orderBy: { createdAt: "desc" },
    take
  });

  const chats = await prisma.chat.findMany({
    where: {
      members: { some: { userId } },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        {
          members: {
            some: {
              user: {
                is: {
                  profile: {
                    is: {
                      displayName: { contains: q, mode: "insensitive" }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    },
    include: chatInclude(userId),
    take
  });

  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: new Date() },
      OR: [
        { caption: { contains: q, mode: "insensitive" } },
        { user: { is: { profile: { is: { displayName: { contains: q, mode: "insensitive" } } } } } },
        { user: { is: { profile: { is: { city: { contains: q, mode: "insensitive" } } } } } }
      ]
    },
    include: {
      user: { include: { profile: true } }
    },
    take
  });

  return {
    users: userResults,
    messages: messages.map((message) => ({
      id: message.id,
      text: message.text ?? undefined,
      createdAt: message.createdAt,
      chatId: message.chatId,
      chatTitle: message.chat.title ?? "Conversation"
    })),
    stories: stories.map((story) => ({
      id: story.id,
      caption: story.caption ?? undefined,
      mediaType: story.mediaType as "IMAGE" | "VIDEO",
      userId: story.userId,
      displayName: story.user.profile?.displayName ?? story.user.phone,
      city: story.user.profile?.city ?? undefined,
      mediaUrl: story.mediaUrl
    })),
    chats: await Promise.all(
      chats.map(async (chat) => {
        const mapped = mapConversation(chat, userId, await getUnreadCount(chat.id, userId));
        return {
          id: mapped.id,
          kind: mapped.kind,
          title: mapped.title,
          memberCount: mapped.memberCount,
          unreadCount: mapped.unreadCount
        };
      })
    )
  };
}

// Channel functions for Telegram-like broadcast functionality
export async function createChannel(userId: string, title: string, description?: string) {
  await ensureProfileUpdate(userId);

  const channel = await prisma.chat.create({
    data: {
      kind: "GROUP",
      title,
      description,
      isChannel: true,
      members: {
        create: {
          userId,
          role: "ADMIN"
        }
      }
    },
    select: { id: true }
  });

  const fullChannel = await prisma.chat.findUniqueOrThrow({
    where: { id: channel.id },
    include: chatInclude(userId)
  });

  return mapConversation(fullChannel, userId, 0);
}

export async function subscribeToChannel(userId: string, channelId: string) {
  await ensureProfileUpdate(userId);

  const channel = await prisma.chat.findUnique({
    where: { id: channelId },
    include: { members: true }
  });

  if (!channel || !channel.isChannel) {
    throw new Error("Channel not found");
  }

  // Check if user is already a member
  const existingMember = channel.members.find(m => m.userId === userId);
  if (existingMember) {
    throw new Error("Already subscribed to this channel");
  }

  await prisma.chatMember.create({
    data: {
      chatId: channelId,
      userId,
      role: "MEMBER"
    }
  });

  const updatedChannel = await prisma.chat.findUniqueOrThrow({
    where: { id: channelId },
    include: chatInclude(userId)
  });

  return mapConversation(updatedChannel, userId, 0);
}

export async function broadcastToChannel(userId: string, channelId: string, text: string, mediaUrl?: string, mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT") {
  await ensureProfileUpdate(userId);

  const channel = await prisma.chat.findUnique({
    where: { id: channelId },
    include: { members: true }
  });

  if (!channel || !channel.isChannel) {
    throw new Error("Channel not found");
  }

  // Check if user is admin of the channel
  const member = channel.members.find(m => m.userId === userId);
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only channel admins can broadcast messages");
  }

  const message = await prisma.chatMessage.create({
    data: {
      chatId: channelId,
      senderId: userId,
      text,
      mediaUrl
    },
    include: {
      sender: { include: { profile: true, photos: true } },
      replyTo: { include: { sender: { include: { profile: true, photos: true } } } },
      receipts: true,
      reactions: true
    }
  });

  return mapMessage(message, userId);
}

export async function unsubscribeFromChannel(userId: string, channelId: string) {
  await ensureProfileUpdate(userId);

  const channel = await prisma.chat.findUnique({
    where: { id: channelId },
    include: { members: true }
  });

  if (!channel || !channel.isChannel) {
    throw new Error("Channel not found");
  }

  // Check if user is a member
  const member = channel.members.find(m => m.userId === userId);
  if (!member) {
    throw new Error("Not subscribed to this channel");
  }

  // Don't allow unsubscribing if user is the only admin
  if (member.role === "ADMIN") {
    const adminCount = channel.members.filter(m => m.role === "ADMIN").length;
    if (adminCount === 1) {
      throw new Error("Cannot unsubscribe from channel as the only admin");
    }
  }

  await prisma.chatMember.delete({
    where: {
      chatId_userId: {
        chatId: channelId,
        userId
      }
    }
  });

  return { success: true };
}

export async function getChannelSubscribers(channelId: string) {
  const channel = await prisma.chat.findUnique({
    where: { id: channelId },
    include: {
      members: {
        include: {
          user: {
            include: {
              profile: true,
              photos: { where: { isPrimary: true }, take: 1 }
            }
          }
        }
      }
    }
  });

  if (!channel || !channel.isChannel) {
    throw new Error("Channel not found");
  }

  return channel.members.map(member => ({
    userId: member.userId,
    displayName: member.user.profile?.displayName ?? member.user.phone,
    avatarUrl: member.user.photos[0]?.url ?? null,
    role: member.role,
    joinedAt: member.joinedAt
  }));
}
