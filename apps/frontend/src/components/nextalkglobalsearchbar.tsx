"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { globalSearch, type GlobalSearchResult } from "../services/nextalksearch";
import { isLoggedIn } from "../lib/nextalksession";

const emptyResult: GlobalSearchResult = {
  users: [],
  messages: [],
  stories: [],
  chats: []
};

export function GlobalSearchBar() {
  const [hasSession, setHasSession] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GlobalSearchResult>(emptyResult);

  useEffect(() => {
    setHasSession(isLoggedIn());
  }, []);

  useEffect(() => {
    if (!hasSession || query.trim().length < 2) {
      setResult(emptyResult);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await globalSearch(query.trim(), 7);
        setResult(data);
        setOpen(true);
      } catch {
        setResult(emptyResult);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, hasSession]);

  if (!hasSession) {
    return null;
  }

  const hasAny = result.users.length > 0 || result.messages.length > 0 || result.stories.length > 0 || result.chats.length > 0;

  return (
    <div className="relative mb-4">
      <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
        <span className="text-sm text-slate-400">Recherche</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Users, messages, stories"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
        {loading && <span className="text-xs text-neoblue">scan...</span>}
      </div>

      {open && (
        <div className="glass absolute left-0 right-0 top-14 z-40 rounded-2xl p-3">
          {!hasAny && <p className="text-sm text-slate-300">Aucun resultat</p>}

          {result.users.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Users</p>
              <div className="space-y-1">
                {result.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/messages/${u.chatId}`}
                    className="block rounded-lg px-2 py-1 text-sm text-slate-200 hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    {u.displayName} {u.city ? `- ${u.city}` : ""}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {result.messages.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Messages</p>
              <div className="space-y-1">
                {result.messages.map((m) => (
                  <Link
                    key={m.id}
                    href={`/messages/${m.chatId}`}
                    className="block rounded-lg px-2 py-1 text-sm text-slate-200 hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    <span className="font-semibold">{m.chatTitle}</span>: {m.text ?? "media"}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {result.chats.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Chats</p>
              <div className="space-y-1">
                {result.chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/messages/${chat.id}`}
                    className="block rounded-lg px-2 py-1 text-sm text-slate-200 hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    {chat.title} {chat.kind === "GROUP" ? `(${chat.memberCount})` : ""}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {result.stories.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Stories</p>
              <div className="space-y-1">
                {result.stories.map((s) => (
                  <Link
                    key={s.id}
                    href="/stories"
                    className="block rounded-lg px-2 py-1 text-sm text-slate-200 hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    {s.displayName}: {s.caption ?? "Story"}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
