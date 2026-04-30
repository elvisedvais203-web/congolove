"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "../../components/nextalksectionheader";
import { AuthGuard } from "../../components/nextalkauthguard";
import { getConversations } from "../../services/nextalkchat";

type MatchRow = { id: string; title: string; city?: string; online: boolean; };

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const conversations = await getConversations();
        const privateMatches = conversations
          .filter((c) => c.kind === "PRIVATE")
          .map((c) => ({ id: c.id, title: c.title, city: c.members.find((m) => m.displayName === c.title)?.city, online: c.online }));
        setMatches(privateMatches);
      } catch {
        setStatus("Impossible de charger les matchs pour le moment.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AuthGuard>
      <section className="space-y-4 animate-fade-in">
        <SectionHeader title="Mes matchs" accent="violet" />

        {loading && (
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-3xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-24 rounded bg-white/10" />
                    <div className="h-3 w-16 rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && matches.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            {matches.map((match) => (
              <article key={match.id} className="glass card-hover neon-border-violet rounded-3xl p-5 group">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neoviolet/60 to-neoblue/60 font-heading text-lg font-bold text-white">
                      {getInitials(match.title)}
                    </div>
                    {match.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#39ff14] border-2 border-[#06070e] shadow-[0_0_6px_#39ff14]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-lg font-bold text-white truncate">{match.title}</p>
                    <p className="text-xs text-slate-400">{match.city ?? "RDC"}</p>
                    <span className={`mt-1 inline-block text-[11px] font-medium ${match.online ? "text-[#39ff14]" : "text-slate-500"}`}>
                      {match.online ? "En ligne" : "Hors ligne"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/messages/${match.id}`} className="btn-neon flex-1 rounded-xl py-2 text-sm text-center">Envoyer un message</Link>
                  <Link href={`/profile/${match.id}`} className="btn-outline-neon rounded-xl px-3 py-2 text-sm">Profil</Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && matches.length === 0 && !status && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neoviolet/10 border border-neoviolet/30">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-neoviolet" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z"/></svg>
            </div>
            <p className="font-heading text-xl text-white mb-1">Aucun match pour le moment</p>
            <p className="text-sm text-[var(--muted)] mb-5">Explorez des profils pour creer vos premiers matchs.</p>
            <Link href="/discover" className="btn-neon rounded-2xl px-6 py-3">Decouvrir des profils</Link>
          </div>
        )}
        {status && <p className="text-sm text-gold">{status}</p>}
      </section>
    </AuthGuard>
  );
}