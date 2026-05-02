import api from "../lib/nextalkapi";
import { fetchCsrfToken } from "./nextalksecurity";
import { broadcastToChannel, sendChatMessage, type ChatMessageType } from "./nextalkchat";
import { createFeedPost } from "./nextalksocial";
import { createStory } from "./nextalkstories";

type UploadResult = { url: string; fileName: string };

function guessMessageType(file: File): ChatMessageType {
  const t = String(file.type || "").toLowerCase();
  if (t.startsWith("image/")) return "IMAGE";
  if (t.startsWith("video/")) return "VIDEO";
  if (t.startsWith("audio/")) return "VOICE";
  return "TEXT";
}

async function retry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw lastError;
}

export async function uploadMediaWithRetry(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const csrf = await fetchCsrfToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const upload = await retry(async () => {
    const { data } = await api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf },
      onUploadProgress: (evt) => {
        const total = evt.total ?? 0;
        if (total > 0 && onProgress) {
          onProgress(Math.round((evt.loaded / total) * 100));
        }
      }
    });
    return data;
  });

  const url = String(upload?.url ?? upload?.secure_url ?? upload?.mediaUrl ?? "");
  if (!url) {
    throw new Error("upload_missing_url");
  }

  return { url, fileName: file.name };
}

export async function publishFeedWithOptionalMedia(input: {
  content?: string;
  mediaFile?: File | null;
  onUploadProgress?: (percent: number) => void;
}) {
  const csrf = await fetchCsrfToken();
  let mediaUrl: string | undefined;
  if (input.mediaFile) {
    const folder = input.mediaFile.type.startsWith("video/") ? "reels" : "posts";
    const uploaded = await uploadMediaWithRetry(input.mediaFile, folder, input.onUploadProgress);
    mediaUrl = uploaded.url;
  }
  const content = String(input.content ?? "").trim() || "Nouvelle publication";
  return await retry(() => createFeedPost({ content, mediaUrl }, csrf));
}

export async function publishStoryWithMedia(input: {
  mediaFile: File;
  caption?: string;
  visibility?: "PUBLIC" | "FOLLOWERS";
  onUploadProgress?: (percent: number) => void;
}) {
  const csrf = await fetchCsrfToken();
  const uploaded = await uploadMediaWithRetry(input.mediaFile, "stories", input.onUploadProgress);
  return await retry(() =>
    createStory(
      {
        mediaUrl: uploaded.url,
        mediaType: input.mediaFile.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        caption: input.caption,
        visibility: input.visibility ?? "PUBLIC"
      },
      csrf
    )
  );
}

export async function publishToChannelWithMedia(input: {
  channelId: string;
  text?: string;
  files?: File[];
  onUploadProgress?: (percent: number) => void;
}) {
  const csrf = await fetchCsrfToken();
  const text = String(input.text ?? "").trim();
  if (text) {
    await retry(() => broadcastToChannel(input.channelId, { text, type: "TEXT" }, csrf));
  }
  for (const file of input.files ?? []) {
    const uploaded = await uploadMediaWithRetry(file, "channels", input.onUploadProgress);
    const t = guessMessageType(file);
    const payload =
      t === "TEXT"
        ? { type: "TEXT" as const, text: `📎 ${uploaded.fileName}`, mediaUrl: uploaded.url, fileName: uploaded.fileName }
        : { type: t, mediaUrl: uploaded.url, fileName: uploaded.fileName };
    await retry(() => broadcastToChannel(input.channelId, payload, csrf));
  }
}

export async function sendMessageWithOptionalMedia(input: {
  chatId: string;
  text?: string;
  mediaFile?: File | null;
  onUploadProgress?: (percent: number) => void;
}) {
  const csrf = await fetchCsrfToken();
  const text = String(input.text ?? "").trim();

  if (input.mediaFile) {
    const uploaded = await uploadMediaWithRetry(input.mediaFile, "messages", input.onUploadProgress);
    const type = guessMessageType(input.mediaFile);
    return await retry(() =>
      sendChatMessage(
        input.chatId,
        {
          text: text || undefined,
          mediaUrl: uploaded.url,
          fileName: uploaded.fileName,
          type
        },
        csrf
      )
    );
  }

  if (!text) {
    throw new Error("message_empty");
  }

  return await retry(() => sendChatMessage(input.chatId, { text }, csrf));
}
