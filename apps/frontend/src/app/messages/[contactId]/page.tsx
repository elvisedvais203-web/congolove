"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "../../../components/AuthGuard";
import { getStoredUser } from "../../../lib/session";
import { fetchCsrfToken } from "../../../services/security";
import { sendChatMessage, getChatMessages, deleteChatMessage, type ChatMessage } from "../../../services/chat";

export default function ConversationPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const router = useRouter();
  const me = typeof window !== "undefined" ? getStoredUser() : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contactId) return;
    getChatMessages(contactId as string).then((res) => setMessages(res?.items ?? [])).catch(() => {});
  }, [contactId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    try {
      setSending(true);
      const csrf = await fetchCsrfToken();
      const created = await sendChatMessage(contactId as string, { text: text.trim() }, csrf);
      setMessages((prev) => [...prev, created]);
      setText("");
    } catch { } finally { setSending(false); }
  };

  const deleteMsg = async (msgId: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await deleteChatMessage(msgId, csrf);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch { }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-5rem)]">
        <div className="glass neon-border-violet flex items-center gap-3 rounded-3xl px-5 py-4 mb-3">
          <button aria-label="Retour" onClick={() => router.back()} className="shrink-0 text-[var(--muted)] transition hover:text-neoblue">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-neon text-white font-bold text-lg">C</div>
          <div className="flex-1">
            <p className="font-heading font-bold text-white">Conversation</p>
            <span className="flex items-center gap-1 text-xs text-[#39ff14]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#39ff14] shadow-[0_0_6px_#39ff14]" />En ligne
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <svg viewBox="0 0 24 24" className="h-10 w-10 mb-3 text-neoblue" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg>
              <p className="font-heading text-lg text-white">Demarrez la conversation</p>
              <p className="text-sm text-[var(--muted)] mt-1">Envoyez votre premier message.</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderId === me?.id;
            return (
              <div key={msg.id} className={`flex group ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[80%] rounded-3xl px-4 py-3 text-sm ${isMe ? "msg-bubble-out text-white rounded-br-md" : "msg-bubble-in text-slate-200 rounded-bl-md"}`}>
                  <p className="break-words">{msg.text ?? (msg.type === "IMAGE" ? "Image" : msg.type === "VIDEO" ? "Video" : "Message")}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted)] text-right">{new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                  {isMe && (
                    <button onClick={() => void deleteMsg(msg.id)} className="absolute -top-1 -left-7 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 text-xs transition">x</button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="glass neon-border rounded-3xl p-3 mt-2">
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ecrire un message..." rows={1} className="input-neon flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm" disabled={sending} />
            <button aria-label="Envoyer le message" onClick={() => void send()} disabled={sending || !text.trim()} className="btn-neon shrink-0 rounded-2xl px-4 py-2.5 disabled:opacity-50">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}