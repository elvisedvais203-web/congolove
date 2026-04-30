"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { globalSearch, type GlobalSearchResult } from "../../services/nextalksearch";
import { getSuggestions } from "../../services/nextalksocial";
import { getStoryFeed } from "../../services/nextalkstories";
import { AuthGuard } from "../../components/nextalkauthguard";
import { SectionHeader } from "../../components/nextalksectionheader";

type RecentSearch = { q: string; ts: number };

const RECENT_KEY = "kl_recent_search_v1";
const RECENT_TTL_MS = 1000 * 60 * 45; // 45 minutes
const RECENT_MAX = 10;

function loadRecent(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const rows = raw ? (JSON.parse(raw) as RecentSearch[]) : [];
    const now = Date.now();
    return (Array.isArray(rows) ? rows : []).filter((r) => r?.q && now - Number(r.ts) < RECENT_TTL_MS);
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  if (typeof window === "undefined") return;
  const cleaned = q.trim();
  if (!cleaned) return;
  const now = Date.now();
  const prev = loadRecent().filter((r) => r.q.toLowerCase() !== cleaned.toLowerCase());
  const next = [{ q: cleaned, ts: now }, ...prev].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function clearRecent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_KEY);
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [popularPeople, setPopularPeople] = useState<any[]>([]);
  const [popularVideos, setPopularVideos] = useState<any[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setRecent(loadRecent());

    getSuggestions(12)
      .then((rows) => setPopularPeople(Array.isArray(rows) ? rows : []))
      .catch(() => setPopularPeople([]));

    getStoryFeed()
      .then((rows: any[]) => {
        const list = (rows ?? []).filter((s) => String(s?.mediaType ?? "").toUpperCase() === "VIDEO");
        setPopularVideos(list.slice(0, 12));
      })
      .catch(() => setPopularVideos([]));
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await globalSearch(query, 12);
        setResult(data);
        saveRecent(query);
        setRecent(loadRecent());
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [q]);

  const users = result?.users ?? [];
  const videos = useMemo(() => (result?.stories ?? []).filter((s) => String(s?.mediaType ?? "").toUpperCase() === "VIDEO"), [result]);

  return (
    <AuthGuard>
      <section className="pb-20 animate-fade-in">
        <SectionHeader title="Recherche" />

        <div className="glass rounded-3xl p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Trouver un compte ou une video</p>
              <div className="mt-2 flex gap-2">
                <div className="glass flex flex-1 items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="text-sm text-slate-400" aria-hidden>
                    🔎
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher une personne ou une video..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  {loading ? <span className="text-xs text-neoblue">scan...</span> : null}
                </div>
                <button
                  onClick={() => {
                    setQ("");
                    setResult(null);
                  }}
                  className="btn-outline-neon rounded-2xl px-4 py-2 text-sm"
                  type="button"
                >
                  Effacer
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  clearRecent();
                  setRecent([]);
                }}
                className="wa-pill px-3 py-2 text-xs"
                type="button"
              >
                Effacer historique
              </button>
              <Link href="/" className="wa-pill px-3 py-2 text-xs">
                Retour accueil
              </Link>
            </div>
          </div>

          {recent.length > 0 && !q.trim() ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Recherches récentes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={`${r.q}-${r.ts}`}
                    onClick={() => setQ(r.q)}
                    className="wa-pill px-3 py-1.5 text-xs"
                    type="button"
                    title={new Date(r.ts).toLocaleString("fr-FR")}
                  >
                    {r.q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {q.trim().length >= 2 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Comptes</p>
              <div className="mt-3 space-y-2">
                {users.length === 0 ? <p className="text-sm text-slate-400">Aucun compte trouvé.</p> : null}
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{u.displayName}</p>
                      <p className="truncate text-xs text-slate-400">{u.city ? u.city : "—"}</p>
                    </div>
                    <Link href={`/messages/${u.chatId}`} className="wa-pill px-3 py-1.5 text-xs">
                      Ouvrir
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vidéos</p>
              <div className="mt-3 space-y-2">
                {videos.length === 0 ? <p className="text-sm text-slate-400">Aucune video trouvée.</p> : null}
                {videos.map((v) => (
                  <Link
                    key={v.id}
                    href="/stories"
                    className="block rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    <span className="font-semibold">{v.displayName}</span>
                    <span className="text-slate-300">{v.caption ? ` — ${v.caption}` : " — video"}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Personnes populaires</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {popularPeople.length === 0 ? <p className="text-sm text-slate-400">Chargement...</p> : null}
                {popularPeople.slice(0, 8).map((p: any) => (
                  <div key={p?.id ?? p?.userId ?? p?.followingId ?? Math.random()} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="truncate text-sm font-semibold text-white">{p?.displayName ?? p?.name ?? "Utilisateur"}</p>
                    <p className="truncate text-xs text-slate-400">{p?.city ?? "Populaire maintenant"}</p>
                    {p?.chatId ? (
                      <Link href={`/messages/${p.chatId}`} className="wa-pill mt-2 inline-flex px-3 py-1.5 text-xs">
                        Ouvrir
                      </Link>
                    ) : (
                      <Link href="/discover" className="wa-pill mt-2 inline-flex px-3 py-1.5 text-xs">
                        Découvrir
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vidéos populaires</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {popularVideos.length === 0 ? <p className="text-sm text-slate-400">Chargement...</p> : null}
                {popularVideos.slice(0, 8).map((s: any) => (
                  <Link
                    key={s.id}
                    href="/stories"
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a1124]"
                    title={s.caption ?? "Video"}
                  >
                    <video src={s.mediaUrl} className="h-40 w-full object-cover opacity-90 transition group-hover:scale-[1.02] group-hover:opacity-100" muted />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="truncate text-xs font-semibold text-white">{s.displayName}</p>
                      <p className="truncate text-[11px] text-white/70">{s.caption ?? "Video populaire"}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Astuce: tape au moins 2 lettres pour lancer une recherche.
              </p>
            </div>
          </div>
        )}
      </section>
    </AuthGuard>
  );
}

