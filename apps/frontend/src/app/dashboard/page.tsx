"use client";

import { SectionHeader } from "../../components/SectionHeader";
import Link from "next/link";
import { StoryBar } from "../../components/StoryBar";
import { AuthGuard } from "../../components/AuthGuard";
import { useEffect, useMemo, useState } from "react";
import { getAiRecommendations, type AiRecommendations } from "../../services/ai";

const storyItems = [
  { id: "1", name: "Nadine", avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f", unread: true },
  { id: "2", name: "Merveille", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80", unread: true },
  { id: "3", name: "Elie", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e" },
  { id: "4", name: "Patrick", avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004" }
];

const statItems = [
  { label: "Likes recus", icon: "heart", href: "/likes", color: "pink" },
  { label: "Matches", icon: "bolt", href: "/matches", color: "violet" },
  { label: "Messages", icon: "msg", href: "/messages", color: "blue" },
  { label: "Vues profil", icon: "eye", href: "/profile", color: "gold" }
];

function StatIcon({ type }: { type: string }) {
  if (type === "heart") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
  if (type === "bolt") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></svg>;
  if (type === "msg") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

export default function DashboardPage() {
  const [likes, setLikes] = useState<Record<string, number>>({ p1: 12, p2: 20 });
  const [aiData, setAiData] = useState<AiRecommendations | null>(null);

  const fallbackPosts = [
    { id: "p1", author: "Nadine", location: "Kinshasa", text: "Soiree rooftop ce weekend, qui est partant ?", image: "https://images.unsplash.com/photo-1511578314322-379afb476865" },
    { id: "p2", author: "Amani", location: "Goma", text: "Cafe + discussion startup demain matin.", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085" }
  ];

  useEffect(() => {
    const bootstrap = localStorage.getItem("kl_ai_bootstrap");
    if (!bootstrap) return;
    try {
      const parsed = JSON.parse(bootstrap);
      getAiRecommendations(parsed).then(setAiData).catch(() => undefined);
    } catch { }
  }, []);

  const posts = useMemo(() => {
    if (!aiData?.media?.length) return fallbackPosts;
    return aiData.media.slice(0, 6).map((item, index) => ({
      id: item.id, author: item.displayName, location: item.city ?? "RDC",
      text: `Suggestion IA #${index + 1} basee sur votre profil`, image: item.mediaUrl
    }));
  }, [aiData]);

  const matchOfDay = aiData?.people?.[0] ?? null;

  const statColors: Record<string, string> = {
    pink: "text-[#ff3cac] bg-[#ff3cac]/10 border-[#ff3cac]/30",
    violet: "text-neoviolet bg-neoviolet/10 border-neoviolet/30",
    blue: "text-neoblue bg-neoblue/10 border-neoblue/30",
    gold: "text-gold bg-gold/10 border-gold/30"
  };

  return (
    <AuthGuard>
      <section className="space-y-6 animate-fade-in">
        <SectionHeader title="Dashboard" subtitle="Feed intelligent style app de rencontre" />

        <StoryBar
          items={aiData?.stories?.length
            ? aiData.stories.slice(0, 12).map((story) => ({ id: story.id, name: story.displayName, avatar: story.mediaUrl, unread: true }))
            : storyItems}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statItems.map((s) => (
            <Link key={s.label} href={s.href} className={`glass card-hover flex flex-col gap-2 rounded-2xl border p-4 ${statColors[s.color]}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-current/10 ${statColors[s.color].split(" ")[0]}`}><StatIcon type={s.icon} /></span>
              <p className="text-xs text-[var(--muted)]">{s.label}</p>
              <p className="font-heading text-2xl font-bold text-white">0</p>
            </Link>
          ))}
        </div>

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

        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="glass card-hover rounded-3xl overflow-hidden neon-border">
              <div className="relative">
                <img src={post.image} alt={post.author} className="h-64 w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06070e] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-heading text-lg font-bold text-white">{post.author}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
                    {post.location}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-200">{post.text}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setLikes((prev) => ({ ...prev, [post.id]: (prev[post.id] ?? 0) + 1 }))} className="flex items-center gap-1 rounded-xl bg-[#ff3cac]/10 border border-[#ff3cac]/30 px-3 py-1.5 text-sm text-[#ff3cac] hover:bg-[#ff3cac]/20 transition">
                    <span>♥</span> {likes[post.id] ?? 0}
                  </button>
                  <button className="flex items-center gap-1 rounded-xl bg-neoblue/10 border border-neoblue/30 px-3 py-1.5 text-sm text-neoblue hover:bg-neoblue/20 transition">
                    <span>◎</span> Commenter
                  </button>
                  <button className="flex items-center gap-1 rounded-xl bg-neoviolet/10 border border-neoviolet/30 px-3 py-1.5 text-sm text-neoviolet hover:bg-neoviolet/20 transition">
                    <span>↑</span> Partager
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[["Likes", "/likes", "pink"], ["Matches", "/matches", "violet"], ["Notifs", "/notifications", "blue"], ["Reseau", "/network", "gold"], ["Stories", "/stories", "pink"], ["Aide", "/help", "blue"]].map(([label, href, color]) => (
            <Link key={label} href={href} className={`glass card-hover rounded-2xl px-4 py-3 text-sm font-medium text-center transition ${color === "pink" ? "hover:neon-text-pink" : color === "violet" ? "hover:neon-text-violet" : color === "gold" ? "hover:neon-text-gold" : "hover:neon-text"}`}>{label}</Link>
          ))}
        </div>
      </section>
    </AuthGuard>
  );
}