import api from "../lib/api";

export type AiPreferencesInput = {
  interests?: string[];
  city?: string;
  lookingFor?: "SERIOUS" | "FUN" | "FRIENDSHIP";
  contentModes?: Array<"PEOPLE" | "PHOTO" | "VIDEO">;
  displayName?: string;
};

export type AiRecommendations = {
  people: Array<{
    id: string;
    displayName: string;
    city: string | null;
    interests: string[];
    avatarUrl: string | null;
    planTier: "FREE" | "PREMIUM";
    score: number;
    compatibilityPercent: number;
  }>;
  stories: Array<{
    id: string;
    userId: string;
    displayName: string;
    city: string | null;
    mediaUrl: string;
    mediaType: string;
    caption: string | null;
    score: number;
  }>;
  media: Array<{
    id: string;
    userId: string;
    displayName: string;
    city: string | null;
    mediaUrl: string;
    mediaType: string;
    score: number;
  }>;
};

export async function saveAiPreferences(payload: AiPreferencesInput, csrfToken: string) {
  const { data } = await api.post("/ai/preferences", payload, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function getAiRecommendations(payload: AiPreferencesInput) {
  const { data } = await api.post("/ai/recommendations", payload);
  return data as AiRecommendations;
}

export async function getAiIcebreakers(chatId?: string) {
  const { data } = await api.post<{ items: string[] }>("/ai/icebreakers", { chatId });
  return data.items;
}

export async function getCompatibility(targetUserId: string) {
  const { data } = await api.get<{ percent: number; reasons: string[] }>(`/matching/compatibility/${targetUserId}`);
  return data;
}
