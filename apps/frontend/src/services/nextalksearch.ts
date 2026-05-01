import api from "../lib/nextalkapi";

export type GlobalSearchResult = {
  users: Array<{
    id: string;
    chatId: string;
    displayName: string;
    city?: string;
    avatarUrl?: string | null;
    role: "USER" | "ADMIN" | "SUPERADMIN";
  }>;
  messages: Array<{
    id: string;
    text?: string;
    createdAt: string;
    chatId: string;
    chatTitle: string;
  }>;
  stories: Array<{
    id: string;
    caption?: string;
    mediaType: "IMAGE" | "VIDEO";
    userId: string;
    displayName: string;
    city?: string;
    mediaUrl: string;
  }>;
  chats: Array<{
    id: string;
    kind: "PRIVATE" | "GROUP";
    title: string;
    memberCount: number;
    unreadCount: number;
  }>;
};

export async function globalSearch(q: string, limit = 6) {
  const { data } = await api.get<GlobalSearchResult>("/search/global", {
    params: { q, limit }
  });
  return data;
}
