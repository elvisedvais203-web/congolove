import api from "../lib/api";

export type ChatKind = "PRIVATE" | "GROUP";
export type ChatMessageType = "TEXT" | "IMAGE" | "VIDEO" | "VOICE" | "STICKER";

export type ConversationMember = {
  id: string;
  displayName: string;
  city?: string;
  avatarUrl?: string | null;
  online: boolean;
  role: "USER" | "ADMIN" | "SUPERADMIN";
};

export type Conversation = {
  id: string;
  kind: ChatKind;
  title: string;
  avatarUrl?: string | null;
  memberCount: number;
  members: ConversationMember[];
  adminIds: string[];
  archived: boolean;
  unreadCount: number;
  online: boolean;
  lastMessage: {
    id: string;
    text?: string;
    type: ChatMessageType;
    createdAt: string;
    senderId: string;
    reactions: Array<{ emoji: string; userId: string }>;
  } | null;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  recipientId?: string;
  type: ChatMessageType;
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  durationSec?: number;
  isRead: boolean;
  deliveredTo: string[];
  readBy: string[];
  reactions: Array<{ emoji: string; userId: string }>;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  status: "sent" | "delivered" | "read" | "received";
};

export async function getConversations(options?: { q?: string; archived?: boolean }) {
  const { data } = await api.get<Conversation[]>("/chats/conversations", {
    params: { q: options?.q ?? "", archived: options?.archived ?? false }
  });
  return data;
}

export async function getChatMessages(chatId: string, options?: { q?: string; cursor?: number; limit?: number }) {
  const { data } = await api.get<{ items: ChatMessage[]; nextCursor: number | null; chat: Conversation }>(
    `/chats/${chatId}/messages`,
    {
      params: {
        q: options?.q ?? "",
        cursor: options?.cursor,
        limit: options?.limit ?? 40
      }
    }
  );
  return data;
}

export async function searchInChat(chatId: string, q: string) {
  const { data } = await api.get<ChatMessage[]>(`/chats/${chatId}/search`, { params: { q } });
  return data;
}

export async function sendChatMessage(
  chatId: string,
  payload: {
    text?: string;
    mediaUrl?: string;
    fileName?: string;
    durationSec?: number;
    type?: ChatMessageType;
  },
  csrfToken: string
) {
  const { data } = await api.post<ChatMessage>(`/chats/${chatId}/messages`, payload, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function markConversationRead(chatId: string, csrfToken: string) {
  const { data } = await api.post<{ ok: boolean; updated: number }>(
    `/chats/${chatId}/read`,
    {},
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function archiveConversation(chatId: string, archived: boolean, csrfToken: string) {
  const { data } = await api.post<Conversation>(
    `/chats/${chatId}/archive`,
    { archived },
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function editChatMessage(messageId: string, text: string, csrfToken: string) {
  const { data } = await api.patch<ChatMessage>(
    `/chats/messages/${messageId}`,
    { text },
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function deleteChatMessage(messageId: string, csrfToken: string) {
  const { data } = await api.delete<ChatMessage>(`/chats/messages/${messageId}`, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function reactToMessage(messageId: string, emoji: string, csrfToken: string) {
  const { data } = await api.post<ChatMessage>(
    `/chats/messages/${messageId}/reactions`,
    { emoji },
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function getGroups() {
  const { data } = await api.get<Conversation[]>("/chats/groups");
  return data;
}

export async function createGroupChat(
  payload: { title: string; memberIds: string[]; avatarUrl?: string },
  csrfToken: string
) {
  const { data } = await api.post<Conversation>("/chats/groups", payload, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function addGroupMember(chatId: string, memberId: string, csrfToken: string) {
  const { data } = await api.post<Conversation>(
    `/chats/groups/${chatId}/members`,
    { memberId },
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function removeGroupMember(chatId: string, memberId: string, csrfToken: string) {
  const { data } = await api.delete<Conversation>(`/chats/groups/${chatId}/members/${memberId}`, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function getPresence() {
  const { data } = await api.get<Array<{ userId: string; status: "online" | "offline"; lastSeenAt: string }>>(
    "/presence/online"
  );
  return data;
}

export async function pingPresence() {
  const { data } = await api.post<{ ok: boolean; ts: string }>("/presence/ping");
  return data;
}

export async function clearAllConversations(csrfToken: string) {
  const { data } = await api.post<{ ok: boolean; chats: number; messagesCleared: number; archived: number }>(
    "/chats/maintenance/clear-all",
    {},
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function deleteAllConversations(csrfToken: string) {
  const { data } = await api.delete<{
    ok: boolean;
    chatsRemoved: number;
    membershipsRemoved: number;
    reactionsRemoved: number;
    orphanChatsRemoved: number;
  }>("/chats/maintenance/delete-all", {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}
