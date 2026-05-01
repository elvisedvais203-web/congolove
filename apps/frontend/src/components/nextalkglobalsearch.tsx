"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { globalSearch, type GlobalSearchResult } from "../services/nextalksearch";

export function GlobalSearchBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResult | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const rows = await globalSearch(q.trim(), 5);
        setData(rows);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q]);

  const total =
    (data?.users.length ?? 0) +
    (data?.chats.length ?? 0) +
    (data?.messages.length ?? 0) +
    (data?.stories.length ?? 0);

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <input
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher utilisateurs, messages, stories, canaux..."
          className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-10 py-2.5 text-sm text-white placeholder:text-slate-400 backdrop-blur-xl transition focus:border-neoblue/60"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      </div>

      {open && (q.trim().length > 0 || loading) ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[70] max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-[#0a1325f2] p-3 shadow-2xl backdrop-blur-2xl">
          {loading ? <p className="text-xs text-slate-300">Recherche en cours...</p> : null}
          {!loading && total === 0 ? <p className="text-xs text-slate-400">Aucun résultat.</p> : null}

          {data?.users?.length ? (
            <div className="mb-2">
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">Utilisateurs</p>
              <div className="space-y-1">
                {data.users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/messages/${user.chatId}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    {user.displayName}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {data?.chats?.length ? (
            <div className="mb-2">
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">Conversations</p>
              <div className="space-y-1">
                {data.chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/messages/${chat.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    {chat.title}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {data?.stories?.length ? (
            <div className="mb-2">
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">Stories</p>
              <div className="space-y-1">
                {data.stories.map((story) => (
                  <Link
                    key={story.id}
                    href="/stories"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    {story.displayName} {story.caption ? `- ${story.caption}` : ""}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {data?.messages?.length ? (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">Messages</p>
              <div className="space-y-1">
                {data.messages.map((message) => (
                  <Link
                    key={message.id}
                    href={`/messages/${message.chatId}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    {message.chatTitle}: {message.text ?? "..."}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <button onClick={() => setOpen(false)} className="btn-outline-neon mt-3 w-full rounded-xl px-3 py-2 text-xs text-slate-200">
            Fermer
          </button>
        </div>
      ) : null}
    </div>
  );
}
