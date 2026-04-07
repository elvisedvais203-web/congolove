"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { createStory, getStoryFeed, viewStory } from "../../services/stories";
import { fetchCsrfToken } from "../../services/security";
import { getStoredUser } from "../../lib/session";
import Image from "next/image";
import api from "../../lib/api";

type Story = {
  id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
  expiresAt: string;
  viewCount?: number;
  user: { id: string; profile?: { displayName?: string; avatarUrl?: string } };
};

type StoryGroup = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  stories: Story[];
  isMe: boolean;
};

const DURATION = 5000;

export default function StoriesPage() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ groupIdx: number; storyIdx: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [caption, setCaption] = useState("");
  const [storyVisibility, setStoryVisibility] = useState<"PUBLIC" | "FOLLOWERS">("PUBLIC");
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const me = typeof window !== "undefined" ? getStoredUser() : null;

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const data: Story[] = await getStoryFeed();
      const map = new Map<string, StoryGroup>();
      for (const s of data) {
        const uid = s.user.id;
        if (!map.has(uid)) {
          map.set(uid, {
            userId: uid,
            displayName: s.user.profile?.displayName ?? "Utilisateur",
            avatarUrl: s.user.profile?.avatarUrl,
            stories: [],
            isMe: uid === me?.id,
          });
        }
        map.get(uid)!.stories.push(s);
      }
      const sorted = [...map.values()].sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0));
      setGroups(sorted);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [me?.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const stopProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = null;
  };

  const goNext = useCallback(() => {
    if (!viewer) return;
    const group = groups[viewer.groupIdx];
    if (viewer.storyIdx < group.stories.length - 1) {
      setViewer({ ...viewer, storyIdx: viewer.storyIdx + 1 });
    } else if (viewer.groupIdx < groups.length - 1) {
      setViewer({ groupIdx: viewer.groupIdx + 1, storyIdx: 0 });
    } else {
      setViewer(null);
    }
  }, [viewer, groups]);

  const goPrev = useCallback(() => {
    if (!viewer) return;
    if (viewer.storyIdx > 0) {
      setViewer({ ...viewer, storyIdx: viewer.storyIdx - 1 });
    } else if (viewer.groupIdx > 0) {
      const prevGroup = groups[viewer.groupIdx - 1];
      setViewer({ groupIdx: viewer.groupIdx - 1, storyIdx: prevGroup.stories.length - 1 });
    }
  }, [viewer, groups]);

  useEffect(() => {
    if (!viewer || paused) { stopProgress(); return; }
    setProgress(0);
    stopProgress();
    const start = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { stopProgress(); goNext(); }
    }, 50);

    const currentStory = groups[viewer.groupIdx]?.stories[viewer.storyIdx];
    if (currentStory) {
      fetchCsrfToken().then((csrf) => viewStory(currentStory.id, csrf)).catch(() => null);
    }

    return stopProgress;
  }, [viewer, paused, goNext, groups]);

  const openGroup = (groupIdx: number) => {
    setViewer({ groupIdx, storyIdx: 0 });
  };

  const publishStory = async (file: File) => {
    try {
      setPublishing(true);
      setPublishStatus("Envoi en cours...");
      if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"].includes(file.type)) {
        setPublishStatus("Format non supporte. Utilisez JPEG, PNG, WEBP ou MP4.");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "stories");
      const csrf = await fetchCsrfToken();
      const { data: upload } = await api.post("/media/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-csrf-token": csrf
        },
      });
      await createStory({
        mediaUrl: upload.url ?? upload.secure_url ?? upload.mediaUrl,
        mediaType: file.type.startsWith("video") ? "VIDEO" : "IMAGE",
        caption,
        visibility: storyVisibility
      }, csrf);
      setCaption("");
      setPublishStatus("Story publiee !");
      await loadFeed();
    } catch {
      setPublishStatus("Echec de publication.");
    } finally {
      setPublishing(false);
    }
  };

  const currentGroup = viewer ? groups[viewer.groupIdx] : null;
  const currentStory = currentGroup ? currentGroup.stories[viewer!.storyIdx] : null;
  const isVideo = currentStory?.mediaType === "VIDEO";

  return (
    <AuthGuard>
      {/* Viewer plein ecran */}
      {viewer && currentStory && currentGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {/* Barres de progression */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{ width: i < viewer.storyIdx ? "100%" : i === viewer.storyIdx ? `${progress}%` : "0%" }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-4">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white/60 bg-white/10 flex items-center justify-center shrink-0">
              {currentGroup.avatarUrl ? (
                <Image src={currentGroup.avatarUrl} alt={currentGroup.displayName} width={36} height={36} className="object-cover" />
              ) : (
                <span className="text-sm font-bold text-white">{currentGroup.displayName[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{currentGroup.displayName}</p>
              <p className="text-xs text-white/60">
                {new Date(currentStory.expiresAt).getTime() - Date.now() > 0
                  ? `Expire dans ${Math.ceil((new Date(currentStory.expiresAt).getTime() - Date.now()) / 3600000)}h`
                  : "Expiree"}
              </p>
            </div>
            {typeof currentStory.viewCount === "number" && (
              <span className="flex items-center gap-1 text-xs text-white/70">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {currentStory.viewCount}
              </span>
            )}
            <button onClick={() => { setViewer(null); stopProgress(); }} className="ml-2 text-white/80 hover:text-white text-xl">✕</button>
          </div>

          {/* Media */}
          <div className="absolute inset-0">
            {isVideo ? (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted={false}
                playsInline
              />
            ) : (
              <img src={currentStory.mediaUrl} alt={currentStory.caption ?? "story"} className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-12 left-4 right-4 z-10">
              <p className="text-center text-sm text-white font-medium drop-shadow-lg">{currentStory.caption}</p>
            </div>
          )}

          {/* Navigation */}
          <button onClick={goPrev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="precedent" />
          <button onClick={goNext} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" aria-label="suivant" />
        </div>
      )}

      <section className="pb-20 animate-fade-in">
        {/* Barre stories */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide">
          {/* Ajouter une story */}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex min-w-[72px] flex-col items-center gap-2 text-xs text-slate-300"
            disabled={publishing}
          >
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-neoblue/60 bg-neoblue/10">
              {publishing ? (
                <svg className="h-6 w-6 animate-spin text-neoblue" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-neoblue" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              )}
            </span>
            <span className="text-neoblue font-medium">Ma story</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" aria-label="Choisir photo ou video" title="Choisir photo ou video" onChange={(e) => { const f = e.target.files?.[0]; if (f) publishStory(f); e.target.value = ""; }} />

          {loading && [1,2,3,4].map((i) => (
            <div key={i} className="flex min-w-[72px] flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-full bg-white/10 animate-pulse" />
              <div className="h-3 w-12 rounded bg-white/10 animate-pulse" />
            </div>
          ))}

          {!loading && groups.map((g, idx) => (
            <button key={g.userId} onClick={() => openGroup(idx)} className="flex min-w-[72px] flex-col items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full bg-gradient-to-br from-[#ff3cac] via-neoblue to-neoviolet p-[2.5px]">
                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#06070e] overflow-hidden">
                  {g.avatarUrl ? (
                    <Image src={g.avatarUrl} alt={g.displayName} width={58} height={58} className="object-cover rounded-full" unoptimized />
                  ) : (
                    <span className="text-lg font-bold text-white">{g.displayName[0]?.toUpperCase()}</span>
                  )}
                </span>
              </span>
              <span className="max-w-[68px] truncate font-medium">{g.isMe ? "Moi" : g.displayName}</span>
            </button>
          ))}
        </div>

        {publishStatus && (
          <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium ${publishStatus.includes("!") ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 text-[#ff4d4f]"}`}>
            {publishStatus}
          </div>
        )}

        {/* Legende optionnelle */}
        <div className="glass rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Legende pour ta prochaine story</p>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
            placeholder="Ajoute une legende..."
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setStoryVisibility("PUBLIC")}
              className={`rounded-xl px-3 py-1.5 text-xs ${storyVisibility === "PUBLIC" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
            >
              Story publique
            </button>
            <button
              onClick={() => setStoryVisibility("FOLLOWERS")}
              className={`rounded-xl px-3 py-1.5 text-xs ${storyVisibility === "FOLLOWERS" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
            >
              Abonnes uniquement
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Choisis une photo/video ci-dessus pour publier avec cette legende.</p>
        </div>

        {/* Grille de toutes les stories */}
        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff3cac]/20 to-neoviolet/20 border border-neoviolet/30">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-neoviolet" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <p className="text-lg font-semibold text-white">Aucune story pour le moment</p>
            <p className="mt-2 text-sm text-slate-400">Sois le premier a partager un moment.</p>
            <button onClick={() => fileRef.current?.click()} className="btn-neon mt-6 rounded-2xl px-6 py-3 text-sm font-bold">+ Publier une story</button>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Toutes les stories</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {groups.flatMap((g) =>
                g.stories.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openGroup(groups.indexOf(g))}
                    className="group relative overflow-hidden rounded-2xl aspect-[9/16] bg-[#0a1124]"
                  >
                    {s.mediaType === "VIDEO" ? (
                      <video src={s.mediaUrl} className="absolute inset-0 h-full w-full object-cover" muted />
                    ) : (
                      <img src={s.mediaUrl} alt={s.caption ?? "story"} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                    <div className="absolute top-2 left-2 h-8 w-8 rounded-full overflow-hidden border-2 border-white/60 bg-white/10 flex items-center justify-center">
                      {g.avatarUrl ? (
                        <Image src={g.avatarUrl} alt={g.displayName} width={32} height={32} className="object-cover" unoptimized />
                      ) : (
                        <span className="text-xs font-bold text-white">{g.displayName[0]}</span>
                      )}
                    </div>
                    {s.mediaType === "VIDEO" && (
                      <div className="absolute top-2 right-2 rounded-lg bg-black/50 p-1">
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-xs font-semibold text-white truncate">{g.isMe ? "Moi" : g.displayName}</p>
                      {s.caption && <p className="text-xs text-white/70 truncate mt-0.5">{s.caption}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </AuthGuard>
  );
}
