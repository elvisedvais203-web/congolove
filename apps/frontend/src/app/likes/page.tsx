"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "../../components/SectionHeader";
import { AuthGuard } from "../../components/AuthGuard";
import api from "../../lib/api";
import { getStoredUser } from "../../lib/session";
import { fetchCsrfToken } from "../../services/security";

type LikeRow = {
  id: string;
  sender: {
    id: string;
    displayName: string;
    city?: string;
    photos?: { url: string }[];
    verified?: boolean;
  };
  createdAt: string;
};

export default function LikesPage() {
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const isPremium = user?.planTier === "PREMIUM";

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/matching/likes/received");
        setLikes(res.data ?? []);
      } catch {
        setLikes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sendLike = async (targetUserId: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await api.post("/matching/like", { targetUserId }, { headers: { "x-csrf-token": csrf } });
      setStatus("Like envoye !");
    } catch (e: any) {
      setStatus(e?.response?.data?.message ?? "Impossible d envoyer le like.");
    }
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader
          title="Likes recus"
          subtitle={isPremium ? `${likes.length} personnes ont aime votre profil` : "Debloquez Premium pour voir qui vous a aime"}
          accent="pink"
        />

        {!isPremium && (
          <div className="mb-6 rounded-3xl p-6 neon-border-pink bg-gradient-pink/10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">LOCK</span>
              <div>
                <p className="font-heading text-lg font-bold text-white">Passez Premium</p>
                <p className="text-sm text-[var(--muted)]">Voyez exactement qui a aime votre profil et envoyez des likes illimites.</p>
              </div>
            </div>
            <Link href="/premium"
              className="inline-block btn-gold rounded-2xl px-6 py-2.5 text-sm font-bold">
              Activer Premium - 15 000 CDF / mois
            </Link>
          </div>
        )}

        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <div key={i} className="glass rounded-3xl h-28 animate-pulse neon-border" />
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {likes.map((like, idx) => {
              const blurred = !isPremium && idx >= 1;
              return (
                <article key={like.id} className={`glass rounded-3xl p-4 neon-border-pink card-hover transition-all ${blurred ? "select-none" : ""}`}>
                  <div className={`flex items-center gap-3 ${blurred ? "blur-sm" : ""}`}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-pink text-xl font-bold text-white shadow-neon-pink">
                      {like.sender.displayName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-bold text-white truncate">{like.sender.displayName}</p>
                        {like.sender.verified && (
                          <span className="badge-neon text-[10px] shrink-0">OK</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)]">{like.sender.city ?? "RDC"}</p>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">
                        {new Date(like.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  {!blurred && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => void sendLike(like.sender.id)}
                        className="btn-neon flex-1 rounded-xl py-2 text-xs font-bold">
                        Liker en retour
                      </button>
                      <Link href={`/discover`}
                        className="btn-outline-neon flex-1 rounded-xl py-2 text-xs font-bold text-center">
                        Voir profil
                      </Link>
                    </div>
                  )}
                  {blurred && (
                    <div className="mt-3 text-center">
                      <Link href="/premium" className="text-xs font-semibold text-neopink hover:underline">
                        Debloquer avec Premium
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loading && likes.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center neon-border">
            <p className="text-5xl mb-4">0</p>
            <p className="font-heading text-xl text-white">Aucun like pour l instant</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Completez votre profil et explorez des profils pour plus de visibilite.</p>
            <Link href="/discover" className="mt-4 inline-block btn-neon rounded-2xl px-6 py-2.5 text-sm font-bold">
              Explorer des profils
            </Link>
          </div>
        )}

        {status && (
          <p className="mt-4 text-sm text-neoblue font-medium">{status}</p>
        )}
      </section>
    </AuthGuard>
  );
}
