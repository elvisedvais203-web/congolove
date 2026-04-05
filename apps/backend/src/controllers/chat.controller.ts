import { Response } from "express";
import { MessageType } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import {
  addGroupMember,
  archiveConversation,
  createGroupChat,
  deleteChatMessage,
  editChatMessage,
  globalSearch,
  listChatMessages,
  listConversations,
  listPresence,
  markChatRead,
  pingPresence,
  removeGroupMember,
  searchMessagesInChat,
  sendChatMessage,
  toggleReaction
} from "../services/chat.service";

export async function getConversations(req: AuthRequest, res: Response) {
  const data = await listConversations(req.user!.userId, {
    q: String(req.query.q ?? "") || undefined,
    archived: String(req.query.archived ?? "false") === "true"
  });
  res.json(data);
}

export async function getChatMessages(req: AuthRequest, res: Response) {
  const data = await listChatMessages(req.user!.userId, String(req.params.chatId), {
    q: String(req.query.q ?? "") || undefined,
    cursor: req.query.cursor ? Number(req.query.cursor) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined
  });
  res.json(data);
}

export async function searchChatMessages(req: AuthRequest, res: Response) {
  const data = await searchMessagesInChat(req.user!.userId, String(req.params.chatId), String(req.query.q ?? ""));
  res.json(data);
}

export async function postChatMessage(req: AuthRequest, res: Response) {
  const { type, text, mediaUrl, fileName, durationSec } = req.body as {
    type?: MessageType;
    text?: string;
    mediaUrl?: string;
    fileName?: string;
    durationSec?: number;
  };

  const data = await sendChatMessage(req.user!.userId, {
    chatId: String(req.params.chatId),
    type: type ?? MessageType.TEXT,
    text,
    mediaUrl,
    fileName,
    durationSec,
    planTier: req.user!.planTier
  });
  res.status(201).json(data);
}

export async function readConversation(req: AuthRequest, res: Response) {
  const data = await markChatRead(req.user!.userId, String(req.params.chatId));
  res.json(data);
}

export async function toggleArchiveConversation(req: AuthRequest, res: Response) {
  const data = await archiveConversation(req.user!.userId, String(req.params.chatId), Boolean(req.body.archived));
  res.json(data);
}

export async function patchChatMessage(req: AuthRequest, res: Response) {
  const data = await editChatMessage(req.user!.userId, String(req.params.messageId), String(req.body.text ?? ""));
  res.json(data);
}

export async function removeChatMessage(req: AuthRequest, res: Response) {
  const data = await deleteChatMessage(req.user!.userId, String(req.params.messageId));
  res.json(data);
}

export async function reactChatMessage(req: AuthRequest, res: Response) {
  const data = await toggleReaction(req.user!.userId, String(req.params.messageId), String(req.body.emoji ?? ""));
  res.json(data);
}

export async function getGroups(req: AuthRequest, res: Response) {
  const data = await listConversations(req.user!.userId, { archived: false });
  res.json(data.filter((item) => item.kind === "GROUP"));
}

export async function createGroup(req: AuthRequest, res: Response) {
  const { title, avatarUrl, memberIds } = req.body as { title: string; avatarUrl?: string; memberIds: string[] };
  const data = await createGroupChat(req.user!.userId, { title, avatarUrl, memberIds: memberIds ?? [] });
  res.status(201).json(data);
}

export async function addMember(req: AuthRequest, res: Response) {
  const data = await addGroupMember(req.user!.userId, String(req.params.chatId), String(req.body.memberId));
  res.status(201).json(data);
}

export async function removeMember(req: AuthRequest, res: Response) {
  const data = await removeGroupMember(req.user!.userId, String(req.params.chatId), String(req.params.memberId));
  res.json(data);
}

export async function getPresence(req: AuthRequest, res: Response) {
  const data = await listPresence(req.user!.userId);
  res.json(data);
}

export async function postPresencePing(req: AuthRequest, res: Response) {
  const data = await pingPresence(req.user!.userId);
  res.json(data);
}

export async function searchGlobal(req: AuthRequest, res: Response) {
  const data = await globalSearch(req.user!.userId, String(req.query.q ?? ""), Number(req.query.limit ?? 6));
  res.json(data);
}
