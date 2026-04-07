"use client";

import { useEffect, useState } from "react";
import { ProfileCard } from "../../components/ProfileCard";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";
import { fetchCsrfToken } from "../../services/security";
import { getCompatibility } from "../../services/ai";

export default function DiscoverPage() {
  const [items, setItems] = useState<any[]>([]);
  const [compatibility, setCompatibility] = useState<{ percent: number; reasons: string[] } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"LIKE" | "PASS" | null>(null);
  const [ageFilter, setAgeFilter] = useState<[number, number]>([24, 38]);
  const [distanceFilter, setDistanceFilter] = useState(50);
  const [intentFilter, setIntentFilter] = useState<"TOUS" | "SERIOUS" | "MARRIAGE" | "FRIENDSHIP" | "FUN">("TOUS");

  useEffect(() => {
    api
      .get("/matching/discover?limit=10")
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, []);

  const top = items[0]?.profile;

  useEffect(() => {
    if (!top?.userId) {
      setCompatibility(null);
      return;
    }

    getCompatibility(top.userId)
      .then(setCompatibility)
      .catch(() => setCompatibility(null));
  }, [top?.userId]);

  const handleSwipe = async (action: "LIKE" | "PASS") => {
    if (!top?.userId) {
      return;
    }

    try {
      setBusy(action);
      setStatus("");
      const csrf = await fetchCsrfToken();
      const { data } = await api.post(
        "/matching/swipe",
        { targetUserId: top.userId, action },
        { headers: { "x-csrf-token": csrf } }
      );
      setItems((prev) => prev.slice(1));
      setCompatibility(null);
      setStatus(data?.matched ? "C'est un match !" : action === "LIKE" ? "Like envoye." : "Profil ignore.");
    } catch {
      setStatus("Impossible d'envoyer votre action pour le moment.");
    } finally {
      setBusy(null);
    }
  };

  const handleSuperLike = async () => {
    if (!top?.userId) {
      return;
    }
    await handleSwipe("LIKE");
    setStatus("Super Like envoye (priorite IA beta).");
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Decouverte" subtitle="Swipe intelligent base sur geolocalisation, interets et activite" />
        <div className="mx-auto mb-4 grid max-w-3xl gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Age</p>
            <p className="mt-1 text-sm text-white">
              {ageFilter[0]} - {ageFilter[1]} ans
            </p>
            <input
              type="range"
              min={18}
              max={60}
              value={ageFilter[1]}
              onChange={(e) => setAgeFilter([ageFilter[0], Number(e.target.value)])}
              aria-label="Age maximum"
              className="mt-2 w-full"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Localisation</p>
            <p className="mt-1 text-sm text-white">{distanceFilter} km</p>
            <input type="range" min={5} max={200} step={5} value={distanceFilter} onChange={(e) => setDistanceFilter(Number(e.target.value))} aria-label="Distance maximale" className="mt-2 w-full" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Intentions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["TOUS", "SERIOUS", "MARRIAGE", "FRIENDSHIP", "FUN"].map((intent) => (
                <button
                  key={intent}
                  onClick={() => setIntentFilter(intent as "TOUS" | "SERIOUS" | "MARRIAGE" | "FRIENDSHIP" | "FUN")}
                  className={`rounded-full px-2 py-1 text-[11px] ${intentFilter === intent ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                >
                  {intent}
                </button>
              ))}
            </div>
          </div>
        </div>
        {top ? (
          <div className="mx-auto max-w-md">
            <ProfileCard
              displayName={top.displayName}
              city={top.city}
              bio={top.bio}
              imageUrl={top.user.photos?.[0]?.url ?? "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"}
              interests={top.interests ?? []}
            />
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1124cc] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">Compatibilite IA</p>
                <span className="rounded-full border border-neoblue/30 bg-neoblue/10 px-3 py-1 text-sm text-neoblue">
                  {compatibility?.percent ?? Math.max(40, Math.min(95, Math.round((items[0]?.score ?? 8) * 4 + 30)))}%
                </span>
              </div>
              {compatibility?.reasons?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {compatibility.reasons.map((reason) => (
                    <span key={reason} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                onClick={() => void handleSwipe("PASS")}
                disabled={busy !== null}
                className="rounded-2xl border border-red-400/40 bg-red-500/10 py-3 text-red-200 disabled:opacity-60"
              >
                {busy === "PASS" ? "..." : "Dislike ❌"}
              </button>
              <button onClick={() => void handleSuperLike()} disabled={busy !== null} className="rounded-2xl border border-gold/40 bg-gold/10 py-3 text-gold disabled:opacity-60">
                Super Like ⭐
              </button>
              <button
                onClick={() => void handleSwipe("LIKE")}
                disabled={busy !== null}
                className="rounded-2xl border border-neoblue/40 bg-neoblue/20 py-3 text-neoblue disabled:opacity-60"
              >
                {busy === "LIKE" ? "..." : "Like ❤️"}
              </button>
            </div>
            {status ? <p className="mt-3 text-center text-sm text-gold">{status}</p> : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff3cac]/20 to-neoviolet/20 border border-neoviolet/30">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-neoviolet" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <p className="text-lg font-semibold text-white">Tu as vu tous les profils disponibles</p>
            <p className="mt-2 text-sm text-slate-400">Reviens plus tard ou ajuste tes filtres pour trouver d&apos;autres personnes.</p>
          </div>
        )}
      </section>
    </AuthGuard>
  );
}
