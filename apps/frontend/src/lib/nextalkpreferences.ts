export type RelationshipType = "SERIOUS" | "MARRIAGE" | "FRIENDSHIP" | "FUN";
export type AppLanguage = "FR" | "SW" | "EN";
export type AppTheme = "dark" | "light";
export type ProfileVisibility = "VISIBLE" | "HIDDEN";
export type MessagePolicy = "ALL" | "MATCH_ONLY";
export type VoiceTranscriptMode = "NEVER" | "MANUAL";
export type ChatTheme = "classic" | "aqua" | "sunset";

export type UserPreferences = {
  distanceKm: number;
  ageMin: number;
  ageMax: number;
  relationshipType: RelationshipType;
  language: AppLanguage;
  theme: AppTheme;
  notifMessages: boolean;
  notifLikes: boolean;
  notifCalls: boolean;
  profileVisibility: ProfileVisibility;
  messagePolicy: MessagePolicy;
  hideOnlineStatus: boolean;
  dataSaver: boolean;
  invisibleMode: boolean;
  chatAnimations: boolean;
  readReceipts: boolean;
  autoSaveMedia: boolean;
  voiceTranscriptMode: VoiceTranscriptMode;
  chatTheme: ChatTheme;
};

export const LEGACY_STORAGE_KEY = "kl_user_preferences";
export const PREFERENCES_STORAGE_KEY = "kl_user_preferences_v2";
export const PREFERENCES_UPDATED_EVENT = "kl:preferences:updated";

export const DEFAULT_PREFERENCES: UserPreferences = {
  distanceKm: 30,
  ageMin: 23,
  ageMax: 36,
  relationshipType: "SERIOUS",
  language: "FR",
  theme: "dark",
  notifMessages: true,
  notifLikes: true,
  notifCalls: true,
  profileVisibility: "VISIBLE",
  messagePolicy: "MATCH_ONLY",
  hideOnlineStatus: false,
  dataSaver: false,
  invisibleMode: false,
  chatAnimations: true,
  readReceipts: true,
  autoSaveMedia: false,
  voiceTranscriptMode: "NEVER",
  chatTheme: "classic"
};

function parsePreferences(raw: string | null): Partial<UserPreferences> {
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Partial<UserPreferences>;
  } catch {
    return {};
  }
}

export function getStoredPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  const current = parsePreferences(localStorage.getItem(PREFERENCES_STORAGE_KEY));
  const legacy = parsePreferences(localStorage.getItem(LEGACY_STORAGE_KEY));
  return { ...DEFAULT_PREFERENCES, ...legacy, ...current };
}

export function saveStoredPreferences(prefs: UserPreferences) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(PREFERENCES_UPDATED_EVENT, { detail: prefs }));
}

export function applyPreferencesToDocument(prefs: UserPreferences) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-chat-theme", prefs.chatTheme);
  root.setAttribute("data-chat-animations", prefs.chatAnimations ? "on" : "off");
}
