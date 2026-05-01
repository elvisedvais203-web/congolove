"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCsrfToken } from "../services/nextalksecurity";
import { getAiRecommendations, saveAiPreferences, type AiPreferencesInput, type AiRecommendations } from "../services/nextalkai";
import { isLoggedIn } from "../lib/nextalksession";

const suggestionTags = [
  "musique",
  "voyage",
  "sport",
  "cine",
  "mode",
  "startup",
  "lecture",
  "gaming",
  "food",
  "tech"
];

type Props = {
  onUpdate?: (data: AiRecommendations) => void;
};

export function AiDatingCoach({ onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [sending, setSending] = useState(false);
  const [city, setCity] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<"SERIOUS" | "FUN" | "FRIENDSHIP">("SERIOUS");
  const [contentModes, setContentModes] = useState<Array<"PEOPLE" | "PHOTO" | "VIDEO">>(["PEOPLE", "PHOTO"]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setHasSession(isLoggedIn());

    const seen = localStorage.getItem("kl_ai_coach_seen");
    if (!seen) {
      setOpen(true);
    }

    const bootstrap = localStorage.getItem("kl_ai_bootstrap");
    if (bootstrap) {
      try {
        const parsed = JSON.parse(bootstrap) as AiPreferencesInput;
        setCity(parsed.city ?? "");
        setDisplayName(parsed.displayName ?? "");
        setInterests(parsed.interests ?? []);
        setLookingFor(parsed.lookingFor ?? "SERIOUS");
        setContentModes(parsed.contentModes ?? ["PEOPLE", "PHOTO"]);
      } catch {
        // Ignore malformed local bootstrap.
      }
    }
  }, []);

  const payload = useMemo<AiPreferencesInput>(
    () => ({
      city: city.trim() || undefined,
      displayName: displayName.trim() || undefined,
      interests,
      lookingFor,
      contentModes
    }),
    [city, displayName, interests, lookingFor, contentModes]
  );

  const toggleInterest = (tag: string) => {
    setInterests((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((value) => value !== tag);
      }
      return [...prev, tag].slice(0, 8);
    });
  };

  const toggleMode = (mode: "PEOPLE" | "PHOTO" | "VIDEO") => {
    setContentModes((prev) => {
      if (prev.includes(mode)) {
        return prev.filter((item) => item !== mode);
      }
      return [...prev, mode];
    });
  };

  const runCoach = async () => {
    try {
      setSending(true);
      setStatus("");
      const csrf = await fetchCsrfToken();
      await saveAiPreferences(payload, csrf);
      const recos = await getAiRecommendations(payload);
      onUpdate?.(recos);
      localStorage.setItem("kl_ai_coach_seen", "1");
      localStorage.setItem("kl_ai_bootstrap", JSON.stringify(payload));
      setOpen(false);
      setStatus("Recommandations IA mises a jour.");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "IA indisponible pour le moment.");
    } finally {
      setSending(false);
    }
  };

  if (!hasSession) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-24 right-4 z-40 rounded-full border border-white/15 bg-[#0b1124] px-4 py-2 text-sm text-white shadow-xl md:bottom-6"
      >
        IA Match
      </button>

      {status && <p className="mb-3 text-sm text-gold">{status}</p>}

      {open && (
        <div className="mb-6 rounded-3xl border border-white/15 bg-[#0a1125f0] p-5 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.18em] text-neoblue">Assistant IA</p>
          <h3 className="mt-2 font-heading text-2xl">Trouvons ton style de match</h3>
          <p className="mt-1 text-sm text-slate-300">Quelques reponses pour personnaliser les profils, photos et stories proposes.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-3"
              placeholder="Ton pseudo"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-3"
              placeholder="Ville preferee (Kinshasa, Goma...)"
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm text-slate-200">Ce que tu recherches:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "SERIOUS", label: "Relation serieuse" },
                { key: "FUN", label: "Fun" },
                { key: "FRIENDSHIP", label: "Amitie" }
              ].map((option) => {
                const active = lookingFor === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => setLookingFor(option.key as "SERIOUS" | "FUN" | "FRIENDSHIP")}
                    className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-neoblue/25 text-neoblue" : "bg-white/5 text-slate-300"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm text-slate-200">Centres d'interet:</p>
            <div className="flex flex-wrap gap-2">
              {suggestionTags.map((tag) => {
                const active = interests.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      active ? "border-neoblue bg-neoblue/20 text-neoblue" : "border-white/15 bg-white/5 text-slate-300"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm text-slate-200">Type de contenu prefere:</p>
            <div className="flex gap-2">
              {[
                { key: "PEOPLE", label: "Profils" },
                { key: "PHOTO", label: "Photos" },
                { key: "VIDEO", label: "Videos" }
              ].map((mode) => {
                const active = contentModes.includes(mode.key as "PEOPLE" | "PHOTO" | "VIDEO");
                return (
                  <button
                    key={mode.key}
                    onClick={() => toggleMode(mode.key as "PEOPLE" | "PHOTO" | "VIDEO")}
                    className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-neoblue/25 text-neoblue" : "bg-white/5 text-slate-300"}`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button onClick={runCoach} disabled={sending} className="rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127] disabled:opacity-60">
              {sending ? "Analyse..." : "Lancer IA"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-xl border border-white/20 px-4 py-2 text-slate-200">
              Plus tard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
