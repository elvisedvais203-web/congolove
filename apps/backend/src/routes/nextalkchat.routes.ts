import { Router } from "express";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import { messageLimiter } from "../middleware/nextalksecurity";
import {
  addMember,
  broadcastToChannel,
  clearAllUserConversations,
  createChannel,
  createGroup,
  deleteAllUserConversations,
  getChannelSubscribers,
  getChatMessages,
  getConversations,
  getGroups,
  postChatMessage,
  readConversation,
  removeMember,
  searchChatMessages,
  subscribeToChannel,
  toggleArchiveConversation,
  unsubscribeFromChannel,
  patchChatMessage,
  removeChatMessage,
  reactChatMessage
} from "../controllers/nextalkchat.controller";

const router = Router();

router.get("/conversations", authGuard, getConversations);
router.get("/groups", authGuard, getGroups);
router.post("/groups", authGuard, csrfGuard, createGroup);
router.post("/groups/:chatId/members", authGuard, csrfGuard, addMember);
router.delete("/groups/:chatId/members/:memberId", authGuard, csrfGuard, removeMember);
router.post("/maintenance/clear-all", authGuard, csrfGuard, clearAllUserConversations);
router.delete("/maintenance/delete-all", authGuard, csrfGuard, deleteAllUserConversations);
router.get("/:chatId/messages", authGuard, getChatMessages);
router.get("/:chatId/search", authGuard, searchChatMessages);
router.post("/:chatId/messages", authGuard, csrfGuard, messageLimiter, postChatMessage);
router.post("/:chatId/read", authGuard, csrfGuard, readConversation);
router.post("/:chatId/archive", authGuard, csrfGuard, toggleArchiveConversation);
router.patch("/messages/:messageId", authGuard, csrfGuard, patchChatMessage);
router.delete("/messages/:messageId", authGuard, csrfGuard, removeChatMessage);
router.post("/messages/:messageId/reactions", authGuard, csrfGuard, reactChatMessage);

// Channel routes
router.post("/channels", authGuard, csrfGuard, createChannel);
router.post("/channels/:channelId/subscribe", authGuard, csrfGuard, subscribeToChannel);
router.post("/channels/:channelId/broadcast", authGuard, csrfGuard, messageLimiter, broadcastToChannel);
router.delete("/channels/:channelId/unsubscribe", authGuard, csrfGuard, unsubscribeFromChannel);
router.get("/channels/:channelId/subscribers", authGuard, getChannelSubscribers);

export default router;
