"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGuard } from "./nextalkauthguard";
import { SectionHeader } from "./nextalksectionheader";
import { fetchCsrfToken } from "../services/nextalksecurity";
import { getAiIcebreakers } from "../services/nextalkai";
import api from "../lib/nextalkapi";
import {
  archiveConversation,
  createGroupChat,
  deleteChatMessage,
  editChatMessage,
  getChatMessages,
  getConversations,
  getPresence,
  markConversationRead,
  pingPresence,
  reactToMessage,
  removeGroupMember,
  searchInChat,
  sendChatMessage,
  type ChatMessage,
  type ChatMessageType,
  type Conversation
} from "../services/nextalkchat";
import { getSuggestions } from "../services/nextalksocial";
import { getStoredUser, type AppUser } from "../lib/nextalksession";
import { socket } from "../lib/nextalksocket";
import {
  PREFERENCES_UPDATED_EVENT,
  getStoredPreferences,
  type UserPreferences
} from "../lib/nextalkpreferences";

type Props = {
  contactId?: string;
  initialShowArchived?: boolean;
};

type ConversationMode = "all" | "private" | "group";

type UploadDraft = {
  type: ChatMessageType;
  mediaUrl: string;
  fileName: string;
  durationSec?: number;
};

type IncomingCall = {
  callId: string;
  chatId: string;
  fromUserId: string;
  toUserIds: string[];
  mode: "audio" | "video";
};

const emojiPalette = ["😀", "😂", "😍", "🔥", "❤️", "👍"];
const stickerPalette = ["[sticker:love]", "[sticker:fire]", "[sticker:wow]", "[sticker:cool]"];
const reactionPalette = ["❤️", "🔥", "😂", "👍"];
const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }]
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(value: string) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function isSameMinute(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours() &&
    da.getMinutes() === db.getMinutes()
  );
}

function statusBadge(status: ChatMessage["status"]) {
  if (status === "read") {
    return <span className="text-sky-300">✔✔</span>;
  }
  if (status === "delivered") {
    return <span className="text-slate-300">✔✔</span>;
  }
  if (status === "sent") {
    return <span className="text-slate-400">✔</span>;
  }
  return <span className="text-slate-400">•</span>;
}

export function UltraTelegramChat({ contactId, initialShowArchived = false }: Props) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getStoredPreferences());
  const router = useRouter();
  const [me, setMe] = useState<AppUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(contactId ?? null);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [conversationQuery, setConversationQuery] = useState("");
  const [conversationMode, setConversationMode] = useState<ConversationMode>("all");
  const [messageQuery, setMessageQuery] = useState("");
  const [searchHits, setSearchHits] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null);
  const [typingRemote, setTypingRemote] = useState(false);
  const [recordingRemote, setRecordingRemote] = useState(false);
  const [isRecordingMine, setIsRecordingMine] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [showArchived, setShowArchived] = useState(initialShowArchived);
  const [hasArchivedChats, setHasArchivedChats] = useState(false);
  const [groupNotice, setGroupNotice] = useState<string | null>(null);
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ userId: string; displayName: string; city?: string }>>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callMode, setCallMode] = useState<"audio" | "video" | null>(null);
  const [callNotice, setCallNotice] = useState<string | null>(null);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [icebreakerLoading, setIcebreakerLoading] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [voiceTranscriptDraftId, setVoiceTranscriptDraftId] = useState<string | null>(null);
  const [voiceTranscriptDraft, setVoiceTranscriptDraft] = useState("");
  const [voiceTranscripts, setVoiceTranscripts] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const currentCallPeerRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const typingStartedRef = useRef(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const dragReplyRef = useRef<{ id: string; startX: number; active: boolean } | null>(null);
  const hasLockedChats = false;

  const displayedMessages = searchHits ?? messages;

  const smoothBehavior: ScrollBehavior = preferences.chatAnimations ? "smooth" : "auto";

  const visibleConversations = useMemo(() => {
    const q = conversationQuery.toLowerCase().trim();
    return conversations.filter((conversation) => {
      if (conversationMode === "private" && conversation.kind !== "PRIVATE") {
        return false;
      }
      if (conversationMode === "group" && conversation.kind !== "GROUP") {
        return false;
      }
      if (!q) {
        return true;
      }
      const stack = `${conversation.title} ${conversation.members.map((member) => member.displayName).join(" ")} ${conversation.lastMessage?.text ?? ""}`.toLowerCase();
      return stack.includes(q);
    });
  }, [conversationMode, conversationQuery, conversations]);

  const canCall = useMemo(() => activeChat?.kind === "PRIVATE" && Boolean(me?.id), [activeChat, me?.id]);

  const otherPrivateMember = useMemo(() => {
    if (!activeChat || activeChat.kind !== "PRIVATE" || !me?.id) {
      return null;
    }
    return activeChat.members.find((member) => member.id !== me.id) ?? null;
  }, [activeChat, me?.id]);

  const refreshConversations = async (options?: { q?: string; archived?: boolean }) => {
    try {
      const rows = await getConversations({ q: options?.q ?? conversationQuery, archived: options?.archived ?? showArchived });
      setConversations(rows);
      if (!activeChatId && rows.length > 0) {
        setActiveChatId(rows[0].id);
        setActiveChat(rows[0]);
      }
      if (backendNotice) {
        setBackendNotice(null);
      }
    } catch {
      setBackendNotice("Serveur indisponible: certaines fonctions de messagerie peuvent ne pas répondre.");
      setConversations([]);
    }
  };

  const refreshArchivedAvailability = async () => {
    const archivedRows = await getConversations({ q: "", archived: true });
    setHasArchivedChats((archivedRows ?? []).length > 0);
  };

  const replaceMessage = (updated: ChatMessage) => {
    setMessages((prev) => prev.map((message) => (message.id === updated.id ? updated : message)));
    setSearchHits((prev) => (prev ? prev.map((message) => (message.id === updated.id ? updated : message)) : prev));
  };

  const loadChat = async (chatId: string, options?: { append?: boolean; cursor?: number }) => {
    try {
      const data = await getChatMessages(chatId, { cursor: options?.cursor, limit: 30 });
      setActiveChat(data.chat);
      setNextCursor(data.nextCursor);
      setMessages((prev) => (options?.append ? [...data.items, ...prev] : data.items));
      if (!messageQuery.trim()) {
        setSearchHits(null);
      }
      const csrf = await fetchCsrfToken();
      await markConversationRead(chatId, csrf);
      if (me?.id) {
        socket.emit("message:read", { chatId, readerId: me.id });
      }
      await refreshConversations();
      if (backendNotice) {
        setBackendNotice(null);
      }
    } catch {
      setBackendNotice("Impossible de charger la conversation (serveur indisponible).");
      setMessages([]);
      setActiveChat(null);
    }
  };

  const cleanupCall = () => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    currentCallIdRef.current = null;
    currentCallPeerRef.current = null;
    setCallMode(null);
    setIncomingCall(null);
  };

  const ensurePeer = async (remoteUserId: string) => {
    if (peerRef.current) {
      return peerRef.current;
    }

    const peer = new RTCPeerConnection(rtcConfiguration);
    peer.onicecandidate = (event) => {
      if (event.candidate && currentCallIdRef.current && me?.id && currentCallPeerRef.current) {
        socket.emit("call:signal", {
          callId: currentCallIdRef.current,
          fromUserId: me.id,
          toUserId: currentCallPeerRef.current,
          candidate: event.candidate.toJSON()
        });
      }
    };
    peer.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
        remoteStreamRef.current.addTrack(track);
      }
      if (callMode === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        cleanupCall();
      }
    };

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        peer.addTrack(track, localStreamRef.current);
      }
    }

    peerRef.current = peer;
    currentCallPeerRef.current = remoteUserId;
    return peer;
  };

  const prepareLocalStream = async (mode: "audio" | "video") => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const startCall = async (mode: "audio" | "video") => {
    if (!otherPrivateMember || !me?.id || !activeChat) {
      return;
    }
    try {
      setCallNotice(null);
      setCallMode(mode);
      currentCallIdRef.current = `call-${Date.now()}`;
      await prepareLocalStream(mode);
      const peer = await ensurePeer(otherPrivateMember.id);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("call:start", {
        callId: currentCallIdRef.current,
        chatId: activeChat.id,
        fromUserId: me.id,
        toUserIds: [otherPrivateMember.id],
        mode
      });
      socket.emit("call:signal", {
        callId: currentCallIdRef.current,
        fromUserId: me.id,
        toUserId: otherPrivateMember.id,
        description: offer
      });
    } catch {
      setCallNotice("Impossible de lancer l'appel sur cet appareil.");
      cleanupCall();
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall || !me?.id) {
      return;
    }
    try {
      setCallMode(incomingCall.mode);
      currentCallIdRef.current = incomingCall.callId;
      await prepareLocalStream(incomingCall.mode);
      const peer = await ensurePeer(incomingCall.fromUserId);
      if (pendingOfferRef.current) {
        await peer.setRemoteDescription(pendingOfferRef.current);
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call:accepted", {
        callId: incomingCall.callId,
        fromUserId: me.id,
        toUserId: incomingCall.fromUserId
      });
      socket.emit("call:signal", {
        callId: incomingCall.callId,
        fromUserId: me.id,
        toUserId: incomingCall.fromUserId,
        description: answer
      });
      setIncomingCall(null);
    } catch {
      setCallNotice("L'acceptation de l'appel a echoue.");
      cleanupCall();
    }
  };

  const declineIncomingCall = () => {
    if (!incomingCall || !me?.id) {
      return;
    }
    socket.emit("call:declined", {
      callId: incomingCall.callId,
      fromUserId: me.id,
      toUserId: incomingCall.fromUserId
    });
    cleanupCall();
  };

  const endCall = () => {
    if (currentCallIdRef.current && currentCallPeerRef.current) {
      socket.emit("call:end", {
        callId: currentCallIdRef.current,
        targetUserIds: [currentCallPeerRef.current]
      });
    }
    cleanupCall();
  };

  const handleFileSelection = async (file: File, forcedType?: ChatMessageType) => {
    let mediaUrl = "";
    try {
      setUploadingMedia(true);
      setUploadNotice("Upload media en cours...");
      const csrf = await fetchCsrfToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "messages");
      const { data: uploadJson } = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf },
        onUploadProgress: (evt) => {
          const total = evt.total ?? 0;
          if (total > 0) {
            setUploadProgress(Math.round((evt.loaded / total) * 100));
          }
        }
      });
      if (!uploadJson.url) {
        throw new Error("URL upload manquante");
      }

      mediaUrl = uploadJson.url;
      setUploadNotice("Upload termine.");
    } catch {
      setUploadNotice("Echec upload media. Verifiez format/taille et reessayez.");
      return;
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }

    let type: ChatMessageType = forcedType ?? "IMAGE";
    if (!forcedType) {
      if (file.type.startsWith("video/")) {
        type = "VIDEO";
      } else if (file.type.startsWith("audio/")) {
        type = "VOICE";
      }
    }
    setUploadDraft({ type, mediaUrl, fileName: file.name });
  };

  const toggleRecorder = async () => {
    if (isRecordingMine) {
      recorderRef.current?.stop();
      setIsRecordingMine(false);
      if (activeChatId && me?.id) {
        socket.emit("recording:stop", { chatId: activeChatId, userId: me.id });
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const recorder = new MediaRecorder(stream);
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const blob = new Blob(recorderChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await handleFileSelection(file, "VOICE");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecordingMine(true);
      if (activeChatId && me?.id) {
        socket.emit("recording:start", { chatId: activeChatId, userId: me.id });
      }
    } catch {
      setCallNotice("L'enregistrement vocal n'est pas disponible sur cet appareil.");
    }
  };

  const sendCurrentDraft = async (typeOverride?: ChatMessageType, textOverride?: string) => {
    if (!activeChatId) {
      return;
    }
    const csrf = await fetchCsrfToken();
    const replyToMessageId = replyTo?.id ?? undefined;
    const payload = uploadDraft
      ? {
          type: uploadDraft.type,
          mediaUrl: uploadDraft.mediaUrl,
          fileName: uploadDraft.fileName,
          durationSec: uploadDraft.durationSec,
          text: text.trim() || undefined,
          replyToMessageId
        }
      : {
          type: typeOverride ?? "TEXT",
          text: textOverride ?? text.trim(),
          replyToMessageId
        };

    if (!payload.text && !payload.mediaUrl && payload.type !== "STICKER") {
      return;
    }

    const created = await sendChatMessage(activeChatId, payload, csrf);
    setMessages((prev) => [...prev, created]);
    setText("");
    setUploadDraft(null);
    setShowEmoji(false);
    setShowSticker(false);
    setReplyTo(null);
    await refreshConversations();
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: smoothBehavior }));
  };

  useEffect(() => {
    setMe(getStoredUser());
  }, []);

  useEffect(() => {
    const apply = () => setPreferences(getStoredPreferences());
    const onUpdated = () => apply();

    apply();
    window.addEventListener("storage", apply);
    window.addEventListener(PREFERENCES_UPDATED_EVENT, onUpdated);

    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener(PREFERENCES_UPDATED_EVENT, onUpdated);
    };
  }, []);

  useEffect(() => {
    const boot = async () => {
      await refreshConversations({ archived: showArchived });
      await refreshArchivedAvailability();
      const rows = await getSuggestions(12);
      setSuggestions(rows);
      const presence = await getPresence();
      setConversations((prev) =>
        prev.map((conversation) => {
          const counterpart = conversation.members.find((member) => member.id !== me?.id);
          const match = counterpart ? presence.find((item) => item.userId === counterpart.id) : null;
          return match ? { ...conversation, online: match.status === "online" } : conversation;
        })
      );
    };
    void boot();
  }, [me?.id, showArchived]);

  useEffect(() => {
    if (contactId) {
      setActiveChatId(contactId);
    }
  }, [contactId]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }
    void loadChat(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }
    if (messageQuery.trim().length < 2) {
      setSearchHits(null);
      return;
    }
    const timer = setTimeout(async () => {
      const hits = await searchInChat(activeChatId, messageQuery.trim());
      setSearchHits(hits);
    }, 200);
    return () => clearTimeout(timer);
  }, [activeChatId, messageQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: smoothBehavior });
  }, [messages, searchHits, smoothBehavior]);

  useEffect(() => {
    if (!me?.id) {
      return;
    }

    socket.connect();
    socket.emit("presence:online", me.id);

    const onPresence = (payload: { userId: string; status: "online" | "offline" }) => {
      setConversations((prev) =>
        prev.map((conversation) => ({
          ...conversation,
          online:
            conversation.kind === "PRIVATE" && conversation.members.some((member) => member.id === payload.userId)
              ? payload.status === "online"
              : conversation.online,
          members: conversation.members.map((member) =>
            member.id === payload.userId ? { ...member, online: payload.status === "online" } : member
          )
        }))
      );
      setActiveChat((prev) =>
        prev
          ? {
              ...prev,
              online:
                prev.kind === "PRIVATE" && prev.members.some((member) => member.id === payload.userId)
                  ? payload.status === "online"
                  : prev.online,
              members: prev.members.map((member) =>
                member.id === payload.userId ? { ...member, online: payload.status === "online" } : member
              )
            }
          : prev
      );
    };

    const onTyping = (payload: { chatId: string; userId: string; isTyping: boolean }) => {
      if (payload.chatId === activeChatId && payload.userId !== me.id) {
        setTypingRemote(payload.isTyping);
      }
    };

    const onRecording = (payload: { chatId: string; userId: string; isRecording: boolean }) => {
      if (payload.chatId === activeChatId && payload.userId !== me.id) {
        setRecordingRemote(payload.isRecording);
      }
    };

    const onNewMessage = (message: ChatMessage) => {
      if (message.chatId === activeChatId) {
        setMessages((prev) => [...prev, message]);
      }
      void refreshConversations();
    };

    const onRead = (payload: { chatId: string; readerId: string }) => {
      if (payload.chatId !== activeChatId) {
        return;
      }
      setMessages((prev) =>
        prev.map((message) =>
          // WhatsApp-like: when someone reads the chat, all messages sent by me become read for that reader.
          message.senderId === me.id
            ? {
                ...message,
                readBy: message.readBy.includes(payload.readerId) ? message.readBy : [...message.readBy, payload.readerId],
                status: message.senderId === me.id ? "read" : message.status
              }
            : message
        )
      );
    };

    const onIncomingCall = (payload: IncomingCall) => {
      if (payload.fromUserId !== me.id) {
        setIncomingCall(payload);
        currentCallIdRef.current = payload.callId;
      }
    };

    const onCallSignal = async (payload: {
      callId: string;
      fromUserId: string;
      toUserId: string;
      description?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }) => {
      if (payload.toUserId !== me.id) {
        return;
      }
      if (payload.description?.type === "offer") {
        pendingOfferRef.current = payload.description;
      }
      if (payload.description?.type === "answer" && peerRef.current) {
        await peerRef.current.setRemoteDescription(payload.description);
      }
      if (payload.candidate && peerRef.current) {
        await peerRef.current.addIceCandidate(payload.candidate);
      }
    };

    const onCallAccepted = () => {
      setCallNotice("Appel connecte.");
    };

    const onCallDeclined = () => {
      setCallNotice("Appel refuse.");
      cleanupCall();
    };

    const onCallEnded = () => {
      setCallNotice("Appel termine.");
      cleanupCall();
    };

    socket.on("presence:update", onPresence);
    socket.on("typing:update", onTyping);
    socket.on("recording:update", onRecording);
    socket.on("new_message", onNewMessage);
    socket.on("message:read:update", onRead);
    socket.on("call:incoming", onIncomingCall);
    socket.on("call:signal", onCallSignal);
    socket.on("call:accepted", onCallAccepted);
    socket.on("call:declined", onCallDeclined);
    socket.on("call:ended", onCallEnded);

    const pulse = setInterval(() => {
      void pingPresence();
      socket.emit("presence:heartbeat", me.id);
    }, 12000);

    return () => {
      clearInterval(pulse);
      socket.off("presence:update", onPresence);
      socket.off("typing:update", onTyping);
      socket.off("recording:update", onRecording);
      socket.off("new_message", onNewMessage);
      socket.off("message:read:update", onRead);
      socket.off("call:incoming", onIncomingCall);
      socket.off("call:signal", onCallSignal);
      socket.off("call:accepted", onCallAccepted);
      socket.off("call:declined", onCallDeclined);
      socket.off("call:ended", onCallEnded);
      socket.disconnect();
      cleanupCall();
    };
  }, [activeChatId, me?.id]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }
    socket.emit("join_chat", activeChatId);
    return () => {
      socket.emit("leave_chat", activeChatId);
    };
  }, [activeChatId]);

  const selectConversation = (chatId: string) => {
    setActiveChatId(chatId);
    router.push(`/messages/${chatId}`);
  };

  const loadOlderMessages = async () => {
    if (!activeChatId || !nextCursor) {
      return;
    }
    await loadChat(activeChatId, { append: true, cursor: nextCursor });
  };

  const sendSticker = async (sticker: string) => {
    setText(sticker);
    await sendCurrentDraft("STICKER", sticker);
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) {
      return;
    }
    const csrf = await fetchCsrfToken();
    const updated = await editChatMessage(editingMessageId, editingText.trim(), csrf);
    replaceMessage(updated);
    setEditingMessageId(null);
    setEditingText("");
  };

  const removeMessage = async (messageId: string) => {
    const csrf = await fetchCsrfToken();
    const updated = await deleteChatMessage(messageId, csrf);
    replaceMessage(updated);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const csrf = await fetchCsrfToken();
    const updated = await reactToMessage(messageId, emoji, csrf);
    replaceMessage(updated);
    if (activeChatId && me?.id) {
      socket.emit("message:reaction", { chatId: activeChatId, messageId, userId: me.id, emoji });
    }
  };

  const toggleArchive = async () => {
    if (!activeChatId || !activeChat) {
      return;
    }
    const csrf = await fetchCsrfToken();
    await archiveConversation(activeChatId, !activeChat.archived, csrf);
    if (activeChat.archived) {
      setShowArchived(false);
    }
    await refreshConversations({ archived: activeChat.archived ? false : showArchived });
    await refreshArchivedAvailability();
    if (!activeChat.archived) {
      setActiveChatId(null);
      setActiveChat(null);
      setMessages([]);
    }
  };

  const toggleGroupMember = (memberId: string) => {
    setGroupMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const createGroup = async () => {
    if (!groupTitle.trim()) {
      setGroupNotice("Saisissez un nom de groupe.");
      return;
    }
    try {
      setGroupNotice(null);
      const csrf = await fetchCsrfToken();
      const group = await createGroupChat({ title: groupTitle.trim(), memberIds: groupMembers }, csrf);
      setShowGroupComposer(false);
      setGroupTitle("");
      setGroupMembers([]);
      setGroupNotice("Groupe créé avec succès.");
      await refreshConversations();
      selectConversation(group.id);
    } catch {
      setGroupNotice("Impossible de créer le groupe pour le moment.");
    }
  };

  const kickMember = async (memberId: string) => {
    if (!activeChat || activeChat.kind !== "GROUP") {
      return;
    }
    const csrf = await fetchCsrfToken();
    const updated = await removeGroupMember(activeChat.id, memberId, csrf);
    setActiveChat(updated);
    setConversations((prev) => prev.map((conversation) => (conversation.id === updated.id ? updated : conversation)));
  };

  const stopTyping = () => {
    if (!activeChatId || !me?.id) {
      return;
    }
    if (!typingStartedRef.current) {
      return;
    }
    socket.emit("typing:stop", { chatId: activeChatId, userId: me.id });
    typingStartedRef.current = false;
  };

  const onTextChange = (value: string) => {
    setText(value);
    if (!activeChatId || !me?.id) {
      return;
    }
    if (!typingStartedRef.current) {
      socket.emit("typing:start", { chatId: activeChatId, userId: me.id });
      typingStartedRef.current = true;
    }
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = window.setTimeout(() => {
      stopTyping();
    }, 900);
  };

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, me?.id]);

  const generateIcebreakers = async () => {
    try {
      setIcebreakerLoading(true);
      const items = await getAiIcebreakers(activeChatId ?? undefined);
      setIcebreakers(items);
      if (items[0]) {
        setText(items[0]);
      }
    } catch {
      setCallNotice("Assistant IA indisponible pour le moment.");
    } finally {
      setIcebreakerLoading(false);
    }
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Messages" />

        {backendNotice && (
          <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {backendNotice}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={conversationQuery}
            onChange={(event) => {
              setConversationQuery(event.target.value);
              void refreshConversations({ q: event.target.value, archived: showArchived });
            }}
            className="min-w-[260px] flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none"
            placeholder="Rechercher un chat, un groupe, un membre"
          />
          {(["all", "private", "group"] as const).map((mode) => (
            mode === "group" ? (
              <Link
                key={mode}
                href="/communities"
                className="rounded-full px-4 py-2 text-sm bg-[#38d37f] text-[#07101f]"
              >
                Mon canal
              </Link>
            ) : (
              mode === "private" && !hasLockedChats ? null : (
              <button
                key={mode}
                onClick={() => setConversationMode(mode)}
                className={`rounded-full px-4 py-2 text-sm ${
                  conversationMode === mode ? "bg-[#38d37f] text-[#07101f]" : "glass text-slate-300"
                }`}
              >
                {mode === "all" ? "Tous" : "Prives"}
              </button>
              )
            )
          ))}
          {(hasArchivedChats || showArchived) ? (
            <Link
              href="/messages/archives"
              className={`rounded-full px-4 py-2 text-sm ${showArchived ? "bg-neoblue text-[#07101f]" : "glass text-slate-300"}`}
            >
              Archives
            </Link>
          ) : null}
          <button onClick={() => setShowGroupComposer((prev) => !prev)} className="glass rounded-full px-4 py-2 text-sm text-slate-200">
            Nouveau groupe
          </button>
          {callNotice && <span className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300">{callNotice}</span>}
        </div>

        {showGroupComposer && (
          <div className="glass mb-4 rounded-3xl p-4">
            <p className="mb-3 text-sm font-semibold text-white">Creer un groupe</p>
            <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
              <input
                value={groupTitle}
                onChange={(event) => setGroupTitle(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                placeholder="Nom du groupe"
              />
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => {
                    const selected = groupMembers.includes(suggestion.userId);
                    return (
                      <button
                        key={suggestion.userId}
                        onClick={() => toggleGroupMember(suggestion.userId)}
                        className={`rounded-full px-3 py-1 text-xs ${selected ? "bg-neoblue text-[#07101f]" : "bg-white/10 text-slate-300"}`}
                      >
                        {suggestion.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => void createGroup()} className="rounded-2xl bg-neoblue px-4 py-2 text-sm font-semibold text-[#07101f]">
                Creer
              </button>
            </div>
            {groupNotice ? <p className="mt-3 text-xs text-slate-300">{groupNotice}</p> : null}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="glass rounded-3xl p-3">
            <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
              {visibleConversations.map((conversation) => {
                const active = conversation.id === activeChatId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={`w-full rounded-3xl border px-3 py-3 text-left transition ${
                      active ? "border-neoblue/50 bg-neoblue/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{conversation.title}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                          {conversation.kind === "GROUP" ? `${conversation.memberCount} membres` : conversation.online ? "en ligne" : "hors ligne"}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="rounded-full bg-neoblue px-2 py-0.5 text-[11px] font-bold text-[#061025]">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-300">{conversation.lastMessage?.text ?? "Aucun message"}</p>
                  </button>
                );
              })}
              {visibleConversations.length === 0 && <p className="px-2 py-4 text-sm text-slate-400">Aucune conversation disponible pour le moment.</p>}
            </div>
          </aside>

          <div className="glass flex min-h-[72vh] flex-col rounded-3xl p-4">
            {!activeChat && <p className="text-sm text-slate-300">Choisissez un chat pour commencer.</p>}

            {activeChat && (
              <>
                <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-2xl text-white">{activeChat.title}</h2>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                        {activeChat.kind}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {activeChat.kind === "GROUP"
                        ? activeChat.members.map((member) => member.displayName).join(", ")
                        : preferences.hideOnlineStatus
                          ? "statut masque"
                          : activeChat.online
                            ? "en ligne maintenant"
                            : "hors ligne"}
                    </p>
                    {typingRemote && preferences.chatAnimations && <p className="mt-1 text-xs text-neoblue">en train d'ecrire...</p>}
                    {recordingRemote && <p className="mt-1 text-xs text-amber-300">en train d'enregistrer...</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={messageQuery}
                      onChange={(event) => setMessageQuery(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none"
                      placeholder="Rechercher dans la conversation"
                    />
                    {canCall && (
                      <>
                        <button onClick={() => void startCall("audio")} className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20">
                          Appel audio
                        </button>
                        <button onClick={() => void startCall("video")} className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20">
                          Video
                        </button>
                      </>
                    )}
                    <button onClick={() => void toggleArchive()} className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20">
                      {activeChat.archived ? "Retirer archive" : "Archiver"}
                    </button>
                  </div>
                </header>

                {activeChat.kind === "GROUP" && activeChat.adminIds.includes(me?.id ?? "") && (
                  <div className="mb-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    <p className="mb-2 font-semibold text-white">Gestion groupe</p>
                    <div className="flex flex-wrap gap-2">
                      {activeChat.members
                        .filter((member) => member.id !== me?.id)
                        .map((member) => (
                          <button key={member.id} onClick={() => void kickMember(member.id)} className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
                            Retirer {member.displayName}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {nextCursor && !searchHits && (
                  <button onClick={() => void loadOlderMessages()} className="mb-3 self-center rounded-full bg-white/10 px-4 py-2 text-xs text-slate-200 hover:bg-white/20">
                    Charger plus
                  </button>
                )}

                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {displayedMessages.map((message, index) => {
                    const mine = message.senderId === me?.id;
                    const prev = index > 0 ? displayedMessages[index - 1] : null;
                    const showDateDivider = !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                    const groupedWithPrev =
                      Boolean(prev) &&
                      prev?.senderId === message.senderId &&
                      !showDateDivider &&
                      isSameMinute(prev!.createdAt, message.createdAt);
                    const groupedReactions = reactionPalette
                      .map((emoji) => ({ emoji, count: message.reactions.filter((reaction) => reaction.emoji === emoji).length }))
                      .filter((item) => item.count > 0);

                    return (
                      <div key={message.id}>
                        {showDateDivider && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-slate-200">
                              {formatDateLabel(message.createdAt)}
                            </span>
                          </div>
                        )}

                        <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-3xl border px-3 py-3 transition ${
                              mine ? "border-neoblue/30 bg-neoblue/10" : "border-white/10 bg-white/8"
                            } ${groupedWithPrev ? "mt-1" : "mt-3"}`}
                            onPointerDown={(e) => {
                              dragReplyRef.current = { id: message.id, startX: e.clientX, active: true };
                            }}
                            onPointerMove={(e) => {
                              const s = dragReplyRef.current;
                              if (!s || !s.active || s.id !== message.id) return;
                              if (mine) return;
                              if (e.clientX - s.startX > 70) {
                                setReplyTo(message);
                                dragReplyRef.current = null;
                              }
                            }}
                            onPointerUp={() => {
                              dragReplyRef.current = null;
                            }}
                          >
                            {!groupedWithPrev && (
                              <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                                <span>{mine ? "Vous" : message.sender.displayName}</span>
                                <span>{formatTime(message.createdAt)}</span>
                                {mine && preferences.readReceipts && statusBadge(message.status)}
                                {message.editedAt && <span>(modifie)</span>}
                              </div>
                            )}

                            {mine && preferences.readReceipts && message.status === "read" && message.lastReadAt && (
                              <p className="mb-2 text-[11px] text-sky-200/90">lu à {formatTime(message.lastReadAt)}</p>
                            )}

                            <div className="mb-2 flex items-center justify-end gap-2">
                              <button
                                onClick={() => setReplyTo(message)}
                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
                              >
                                Répondre
                              </button>
                            </div>

                          {editingMessageId === message.id ? (
                            <div className="mb-2 flex gap-2">
                              <input
                                aria-label="Modifier message"
                                value={editingText}
                                onChange={(event) => setEditingText(event.target.value)}
                                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                              />
                              <button onClick={() => void saveEdit()} className="rounded-xl bg-neoblue px-3 py-2 text-xs font-semibold text-[#07101f]">
                                Sauver
                              </button>
                            </div>
                          ) : (
                            <>
                              {message.replyTo && (
                                <div className="mb-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                                  <p className="text-[11px] font-semibold text-slate-200">
                                    Réponse à {message.replyTo.senderId === me?.id ? "vous" : message.replyTo.sender.displayName}
                                  </p>
                                  <p className="truncate text-xs text-slate-300">
                                    {message.replyTo.text ?? (message.replyTo.type === "IMAGE" ? "Image" : message.replyTo.type === "VIDEO" ? "Vidéo" : "Message")}
                                  </p>
                                </div>
                              )}
                              {message.type === "TEXT" || message.type === "STICKER" ? (
                                <p className="text-sm text-white">{message.text}</p>
                              ) : null}
                              {message.type === "IMAGE" && message.mediaUrl ? (
                                <div>
                                  <img src={message.mediaUrl} alt={message.fileName ?? "image"} className="max-h-72 w-full rounded-2xl object-cover" />
                                  {preferences.autoSaveMedia && (
                                    <a href={message.mediaUrl} download={message.fileName ?? "media-image"} className="mt-2 inline-flex rounded-full border border-white/20 px-2 py-1 text-[11px] text-slate-200">
                                      Telecharger
                                    </a>
                                  )}
                                  {message.text && <p className="mt-2 text-sm text-slate-100">{message.text}</p>}
                                </div>
                              ) : null}
                              {message.type === "VIDEO" && message.mediaUrl ? (
                                <div>
                                  <video src={message.mediaUrl} controls className="max-h-72 w-full rounded-2xl" />
                                  {preferences.autoSaveMedia && (
                                    <a href={message.mediaUrl} download={message.fileName ?? "media-video"} className="mt-2 inline-flex rounded-full border border-white/20 px-2 py-1 text-[11px] text-slate-200">
                                      Telecharger
                                    </a>
                                  )}
                                  {message.text && <p className="mt-2 text-sm text-slate-100">{message.text}</p>}
                                </div>
                              ) : null}
                              {message.type === "VOICE" && message.mediaUrl ? (
                                <div>
                                  <audio src={message.mediaUrl} controls className="w-full" />
                                  {preferences.voiceTranscriptMode === "MANUAL" && (
                                    <div className="mt-2">
                                      {voiceTranscriptDraftId === message.id ? (
                                        <div className="flex gap-2">
                                          <input
                                            aria-label="Transcription manuelle"
                                            value={voiceTranscriptDraft}
                                            onChange={(event) => setVoiceTranscriptDraft(event.target.value)}
                                            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none"
                                            placeholder="Saisir la transcription"
                                          />
                                          <button
                                            onClick={() => {
                                              const cleaned = voiceTranscriptDraft.trim();
                                              if (cleaned) {
                                                setVoiceTranscripts((prev) => ({ ...prev, [message.id]: cleaned }));
                                              }
                                              setVoiceTranscriptDraftId(null);
                                              setVoiceTranscriptDraft("");
                                            }}
                                            className="rounded-xl bg-neoblue px-2 py-2 text-xs font-semibold text-[#061025]"
                                          >
                                            OK
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setVoiceTranscriptDraftId(message.id);
                                            setVoiceTranscriptDraft(voiceTranscripts[message.id] ?? "");
                                          }}
                                          className="rounded-full border border-white/20 px-2 py-1 text-[11px] text-slate-200"
                                        >
                                          Transcrire
                                        </button>
                                      )}
                                      {voiceTranscripts[message.id] && <p className="mt-2 text-xs text-slate-200">{voiceTranscripts[message.id]}</p>}
                                    </div>
                                  )}
                                  {preferences.autoSaveMedia && (
                                    <a href={message.mediaUrl} download={message.fileName ?? "media-audio"} className="mt-2 inline-flex rounded-full border border-white/20 px-2 py-1 text-[11px] text-slate-200">
                                      Telecharger
                                    </a>
                                  )}
                                  {message.text && <p className="mt-2 text-sm text-slate-100">{message.text}</p>}
                                </div>
                              ) : null}
                            </>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {reactionPalette.map((emoji) => (
                              <button key={emoji} onClick={() => void toggleReaction(message.id, emoji)} className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/20">
                                {emoji}
                              </button>
                            ))}
                            {mine && !message.deletedAt && (
                              <button
                                onClick={() => {
                                  setEditingMessageId(message.id);
                                  setEditingText(message.text ?? "");
                                }}
                                className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/20"
                              >
                                Modifier
                              </button>
                            )}
                            {mine && !message.deletedAt && (
                              <button onClick={() => void removeMessage(message.id)} className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/20">
                                Supprimer
                              </button>
                            )}
                          </div>

                          {groupedReactions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                              {groupedReactions.map((item) => (
                                <span key={item.emoji} className="rounded-full bg-black/20 px-2 py-1">
                                  {item.emoji} {item.count}
                                </span>
                              ))}
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {uploadDraft && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm text-white">Brouillon media: {uploadDraft.fileName}</p>
                      <button onClick={() => setUploadDraft(null)} className="text-xs text-slate-400">Retirer</button>
                    </div>
                    {uploadDraft.type === "IMAGE" && <img src={uploadDraft.mediaUrl} alt={uploadDraft.fileName} className="max-h-44 rounded-2xl object-cover" />}
                    {uploadDraft.type === "VIDEO" && <video src={uploadDraft.mediaUrl} controls className="max-h-44 rounded-2xl" />}
                    {uploadDraft.type === "VOICE" && <audio src={uploadDraft.mediaUrl} controls className="w-full" />}
                  </div>
                )}

                <div className="mt-4 rounded-3xl border border-white/10 bg-[#070c1d]/80 p-3">
                  {replyTo && (
                    <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-200">
                          Réponse à {replyTo.senderId === me?.id ? "vous" : replyTo.sender.displayName}
                        </p>
                        <p className="truncate text-xs text-slate-300">
                          {replyTo.text ?? (replyTo.type === "IMAGE" ? "Image" : replyTo.type === "VIDEO" ? "Vidéo" : "Message")}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  {uploadNotice ? <p className="mt-2 text-xs text-slate-300">{uploadNotice}</p> : null}
                  {uploadingMedia && uploadProgress > 0 ? (
                    <div className="mt-2">
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-neoblue transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300">Upload message: {uploadProgress}%</p>
                    </div>
                  ) : null}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button onClick={() => void generateIcebreakers()} className="rounded-full bg-neoblue/20 px-3 py-2 text-sm text-neoblue">
                      {icebreakerLoading ? "IA..." : "IA sujet"}
                    </button>
                    <button onClick={() => setShowEmoji((prev) => !prev)} className="rounded-full bg-white/10 px-3 py-2 text-sm text-white">Emoji</button>
                    <button onClick={() => setShowSticker((prev) => !prev)} className="rounded-full bg-white/10 px-3 py-2 text-sm text-white">Sticker</button>
                    <button onClick={() => fileInputRef.current?.click()} className="rounded-full bg-white/10 px-3 py-2 text-sm text-white">Fichier</button>
                    <button onClick={() => cameraInputRef.current?.click()} className="rounded-full bg-white/10 px-3 py-2 text-sm text-white">Camera/Galerie</button>
                    <button onClick={() => void toggleRecorder()} className={`rounded-full px-3 py-2 text-sm ${isRecordingMine ? "bg-amber-400 text-[#08101d]" : "bg-white/10 text-white"}`}>
                      {isRecordingMine ? "Stop micro" : "Micro"}
                    </button>
                  </div>

                  {icebreakers.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {icebreakers.slice(0, 3).map((item) => (
                        <button
                          key={item}
                          onClick={() => setText(item)}
                          className="rounded-full border border-neoblue/30 bg-neoblue/10 px-3 py-1.5 text-xs text-neoblue"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}

                  {showEmoji && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {emojiPalette.map((emoji) => (
                        <button key={emoji} onClick={() => setText((prev) => `${prev}${emoji}`)} className="rounded-full bg-white/10 px-3 py-2 text-lg">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {showSticker && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {stickerPalette.map((sticker) => (
                        <button key={sticker} onClick={() => void sendSticker(sticker)} className="rounded-full bg-white/10 px-3 py-2 text-xs text-slate-100">
                          {sticker}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <textarea
                      value={text}
                      onChange={(event) => onTextChange(event.target.value)}
                      rows={2}
                      className="flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none"
                      placeholder="Ecrivez un message, ajoutez un media, ou envoyez une note vocale"
                    />
                    <button
                      onClick={() => void sendCurrentDraft()}
                      disabled={uploadingMedia}
                      className="rounded-2xl bg-neoblue px-4 py-3 text-sm font-semibold text-[#07101f]"
                    >
                      {text.trim() || uploadDraft ? "Envoyer" : "Pret"}
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    aria-label="Selectionner un fichier"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFileSelection(file);
                      }
                      event.target.value = "";
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*,video/*"
                    aria-label="Camera ou galerie"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFileSelection(file, file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {(incomingCall || callMode) && (
          <div className="fixed inset-0 z-50 bg-[#02040c]/90 p-4 backdrop-blur">
            <div className="mx-auto flex h-full max-w-5xl flex-col justify-center gap-4 rounded-[32px] border border-white/10 bg-[#07101c] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Appel en cours</p>
                  <h3 className="mt-2 font-heading text-3xl text-white">
                    {callMode === "video" || incomingCall?.mode === "video" ? "Video call" : "Audio call"}
                  </h3>
                </div>
                <button onClick={incomingCall ? declineIncomingCall : endCall} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">
                  {incomingCall ? "Refuser" : "Terminer"}
                </button>
              </div>

              {incomingCall && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  Appel entrant. <button onClick={() => void acceptIncomingCall()} className="ml-2 rounded-full bg-neoblue px-3 py-2 font-semibold text-[#07101f]">Accepter</button>
                </div>
              )}

              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-3">
                  <p className="mb-2 text-xs text-slate-400">Vous</p>
                  {callMode === "video" || incomingCall?.mode === "video" ? (
                    <video ref={localVideoRef} autoPlay muted playsInline className="h-[40vh] w-full rounded-3xl object-cover" />
                  ) : (
                    <div className="flex h-[40vh] items-center justify-center rounded-3xl bg-white/5 text-slate-300">Micro actif</div>
                  )}
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/25 p-3">
                  <p className="mb-2 text-xs text-slate-400">Correspondant</p>
                  {callMode === "video" || incomingCall?.mode === "video" ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="h-[40vh] w-full rounded-3xl object-cover" />
                  ) : (
                    <div className="flex h-[40vh] items-center justify-center rounded-3xl bg-white/5 text-slate-300">Audio distant</div>
                  )}
                  <audio ref={remoteAudioRef} autoPlay />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </AuthGuard>
  );
}
