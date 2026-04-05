import { Router } from "express";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";
import { messageLimiter } from "../middleware/security";
import {
  addMember,
  createGroup,
  getChatMessages,
  getConversations,
  getGroups,
  postChatMessage,
  readConversation,
  removeMember,
  searchChatMessages,
  toggleArchiveConversation,
  patchChatMessage,
  removeChatMessage,
  reactChatMessage
} from "../controllers/chat.controller";

const router = Router();

router.get("/conversations", authGuard, getConversations);
router.get("/groups", authGuard, getGroups);
router.post("/groups", authGuard, csrfGuard, createGroup);
router.post("/groups/:chatId/members", authGuard, csrfGuard, addMember);
router.delete("/groups/:chatId/members/:memberId", authGuard, csrfGuard, removeMember);
router.get("/:chatId/messages", authGuard, getChatMessages);
router.get("/:chatId/search", authGuard, searchChatMessages);
router.post("/:chatId/messages", authGuard, csrfGuard, messageLimiter, postChatMessage);
router.post("/:chatId/read", authGuard, csrfGuard, readConversation);
router.post("/:chatId/archive", authGuard, csrfGuard, toggleArchiveConversation);
router.patch("/messages/:messageId", authGuard, csrfGuard, patchChatMessage);
router.delete("/messages/:messageId", authGuard, csrfGuard, removeChatMessage);
router.post("/messages/:messageId/reactions", authGuard, csrfGuard, reactChatMessage);

export default router;
