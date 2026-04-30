"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/nextalkauthguard";
import { SectionHeader } from "../../components/nextalksectionheader";
import { getStoredUser } from "../../lib/nextalksession";
import { getConversations, type Conversation } from "../../services/nextalkchat";

export default function CommunitiesPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Conversation[]>([]);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const me = typeof window !== "undefined" ? getStoredUser() : null;

  const refresh = async (query: string) => {
    try {
      setLoading(true);
      const data = await getConversations({ q: query.trim(), archived: false });
      setRows(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(q), 220);
    return () => clearTimeout(timer);
  }, [q]);

  const groupsAndChannels = useMemo(() => rows.filter((c) => c.kind === "GROUP" && !c.archived), [rows]);
  const mine = useMemo(
    () => groupsAndChannels.filter((c) => Array.isArray(c.adminIds) && Boolean(me?.id) && c.adminIds.includes(me.id)),
    [groupsAndChannels, me?.id]
  );
  const visibleRows = tab === "mine" ? mine : groupsAndChannels;

  return (
    <AuthGuard>
      <section className="space-y-4 animate-fade-in pb-20">
        <SectionHeader title="Groupes & canaux" accent="violet" />

        <div className="glass rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Recherche</p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher un groupe ou un canal..."
            className="input-neon mt-2 w-full rounded-2xl px-3 py-2 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">Astuce: cherche par préfixe du nom du canal / groupe.</p>
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vos abonnements</p>
            <Link href="/channels" className="wa-pill px-3 py-1.5 text-xs">
              Créer / publier
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setTab("all")}
              className={`wa-pill px-3 py-1.5 text-xs ${tab === "all" ? "wa-pill-active" : ""}`}
              type="button"
            >
              Tous
            </button>
            <button
              onClick={() => setTab("mine")}
              className={`wa-pill px-3 py-1.5 text-xs ${tab === "mine" ? "wa-pill-active" : ""}`}
              type="button"
            >
              Mon canal
            </button>
          </div>

          {loading ? <p className="mt-3 text-sm text-slate-300">Chargement...</p> : null}

          {!loading && visibleRows.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Messagerie introuvable.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visibleRows.slice(0, 30).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{c.title}</p>
                    <p className="truncate text-xs text-slate-400">
                      {c.memberCount} membres{typeof c.unreadCount === "number" && c.unreadCount > 0 ? ` • ${c.unreadCount} non lus` : ""}
                    </p>
                  </div>
                  <Link href={`/messages/${c.id}`} className="wa-pill px-3 py-1.5 text-xs">
                    Ouvrir
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AuthGuard>
  );
}

