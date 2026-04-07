"use client";

import Link from "next/link";
import { StoryBar, type StoryItem } from "../../components/StoryBar";
import { AuthGuard } from "../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getAiRecommendations, type AiRecommendations } from "../../services/ai";
import { getStoryFeed } from "../../services/stories";
import { getStoredUser } from "../../lib/session";
import api from "../../lib/api";

type Stats = { likes: number; matches: number; messages: number; views: number };

const statItems = [
  { key: "likes", label: "Likes recus", icon: "heart", href: "/likes", color: "pink" },
  { key: "matches", label: "Matches", icon: "bolt", href: "/matches", color: "violet" },
  { key: "messages", label: "Messages", icon: "msg", href: "/messages", color: "blue" },
  { key: "views", label: "Vues profil", icon: "eye", href: "/profile", color: "gold" },
] as const;

function StatIcon({ type }: { type: string }) {
  if (type === "heart") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
  if (type === "bolt") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></svg>;
  if (type === "msg") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

const colorMap: Record<string, string> = {
  pink: "text-[#ff3cac] bg-[#ff3cac]/10 border-[#ff3cac]/30",
  violet: "text-neoviolet bg-neoviolet/10 border-neoviolet/30",
  blue: "text-neoblue bg-neoblue/10 border-neoblue/30",
  gold: "text-gold bg-gold/10 border-gold/30",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ likes: 0, matches: 0, messages: 0, views: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [storyItems, setStoryItems] = useState<StoryItem[]>([]);
  const [aiData, setAiData] = useState<AiRecommendations | null>(null);
  const me = typeof window !== "undefined" ? getStoredUser() : null;

  useEffect(() => {
    // Charger stats reelles
    Promise.allSettled([
      api.get("/matching/matches/count").catch(() => ({ data: null })),
      api.get("/messages/unread-count").catch(() => ({ data: null })),
      api.get("/social/likes/received").catch(() => ({ data: null })),
      api.get("/profile/views").catch(() => ({ data: null })),
    ]).then(([matchesRes, msgsRes, likesRes, viewsRes]) => {
      const matchesData = matchesRes.status === "fulfilled" ? matchesRes.value : { data: null };
      const msgsData = msgsRes.status === "fulfilled" ? msgsRes.value : { data: null };
      const likesData = likesRes.status === "fulfilled" ? likesRes.value : { data: null };
      const viewsData = viewsRes.status === "fulfilled" ? viewsRes.value : { data: null };

      setStats({
        matches: (matchesData as any)?.data?.count ?? (matchesData as any)?.data?.total ?? 0,
        messages: (msgsData as any)?.data?.count ?? (msgsData as any)?.data?.total ?? 0,
        likes: (likesData as any)?.data?.count ?? (likesData as any)?.data?.total ?? 0,
        views: (viewsData as any)?.data?.count ?? (viewsData as any)?.data?.total ?? 0,
      });
      setStatsLoading(false);
    });

    // Charger stories reelles
    getStoryFeed()
      .then((data: any[]) => {
        const items: StoryItem[] = data.map((s) => ({
          id: s.id,
          userId: s.user?.id ?? s.userId,
          name: s.user?.profile?.displayName ?? s.user?.username ?? "Utilisateur",
          avatar: s.user?.profile?.avatarUrl ?? undefined,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType ?? "IMAGE",
          caption: s.caption ?? undefined,
          expiresAt: s.expiresAt,
          viewCount: s.viewCount ?? undefined,
        }));
        setStoryItems(items);
      })
      .catch(() => setStoryItems([]));

    // Recommandations IA
    const bootstrap = localStorage.getItem("kl_ai_bootstrap");
    if (bootstrap) {
      try {
        const parsed = JSON.parse(bootstrap);
        getAiRecommendations(parsed).then(setAiData).catch(() => undefined);
      } catch { }
    }
  }, []);

  const matchOfDay = aiData?.people?.[0] ?? null;

  return (
    <AuthGuard>
      <section className="space-y-6 animate-fade-in">
        {/* Bienvenue */}
        <div className="glass rounded-3xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Bienvenue</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">{me?.email?.split("@")[0] ?? me?.phone ?? "Toi"} 👋</h1>
          </div>
          <Link href="/profile" className="btn-neon rounded-2xl px-4 py-2 text-sm font-bold">Mon profil</Link>
        </div>

        {/* Stories reelles */}
        {storyItems.length > 0 && <StoryBar items={storyItems} />}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statItems.map((s) => (
            <Link key={s.key} href={s.href} className={`glass card-hover flex flex-col gap-2 rounded-2xl border p-4 ${colorMap[s.color]}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorMap[s.color]}`}><StatIcon type={s.icon} /></span>
              <p className="text-xs text-[var(--muted)]">{s.label}</p>
              {statsLoading ? (
                <div className="h-7 w-10 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <p className="font-heading text-2xl font-bold text-white">{stats[s.key]}</p>
              )}
            </Link>
          ))}
        </div>

        {/* Suggestions IA */}
        {aiData?.people?.length ? (
          <div className="glass neon-border-violet rounded-3xl p-5 animate-slide-up">
            <p className="text-xs font-bold uppercase tracking-[0.18em] neon-text-violet mb-3">Suggestions IA</p>
            {matchOfDay && (
              <article className="mb-4 rounded-2xl bg-gradient-to-r from-neoviolet/20 to-neoblue/20 border border-neoviolet/30 p-4">
                <p className="text-xs uppercase tracking-wide neon-text">Match du jour</p>
                <h3 className="mt-1 font-heading text-xl text-white">{matchOfDay.displayName}</h3>
                <p className="text-sm text-slate-300">{matchOfDay.city ?? "RDC"}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="badge-gold text-xs px-3 py-1 rounded-full">Compat {matchOfDay.compatibilityPercent}%</span>
                  <Link href="/discover" className="btn-neon text-xs px-3 py-1.5 rounded-xl">Decouvrir</Link>
                </div>
              </article>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {aiData.people.slice(0, 6).map((person) => (
                <article key={person.id} className="card-hover rounded-2xl border border-white/10 bg-[#0a1124] p-3">
                  <p className="font-semibold text-white">{person.displayName}</p>
                  <p className="text-xs text-slate-400">{person.city ?? "RDC"}</p>
                  <p className="mt-1 text-xs text-slate-300">{person.interests.slice(0, 3).join(" • ") || "profil compatible"}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="neon-text-gold font-semibold">Compat {person.compatibilityPercent}%</span>
                    <Link href="/discover" className="text-neoblue hover:neon-text transition">Voir</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {/* Acces rapide */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Acces rapide</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[["Likes", "/likes", "pink"],["Matches", "/matches", "violet"],["Notifs", "/notifications", "blue"],["Reseau", "/network", "gold"],["Stories", "/stories", "pink"],["Aide", "/help", "blue"]].map(([label, href, color]) => (
              <Link key={label} href={href} className={`glass card-hover rounded-2xl px-4 py-3 text-sm font-medium text-center transition ${color === "pink" ? "hover:neon-text-pink" : color === "violet" ? "hover:neon-text-violet" : color === "gold" ? "hover:neon-text-gold" : "hover:neon-text"}`}>{label}</Link>
            ))}
          </div>
        </div>

        {/* Etat vide si aucune activite et pas de suggestions IA */}
        {!aiData && !statsLoading && stats.likes === 0 && stats.matches === 0 && (
          <div className="glass rounded-3xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-neoblue/20 to-neoviolet/20 border border-neoviolet/30">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-neoviolet" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <p className="text-lg font-semibold text-white">Ton aventure commence ici</p>
            <p className="mt-2 text-sm text-slate-400">Complete ton profil et decouvre des profils compatibles.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link href="/profile" className="btn-neon rounded-2xl px-5 py-2.5 text-sm font-bold">Completer profil</Link>
              <Link href="/discover" className="glass rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition">Explorer</Link>
            </div>
          </div>
        )}
      </section>
    </AuthGuard>
  );
}