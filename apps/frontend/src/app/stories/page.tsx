"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/nextalkauthguard";
import { getStoryFeed, viewStory } from "../../services/nextalkstories";
import { fetchCsrfToken } from "../../services/nextalksecurity";
import { getStoredUser } from "../../lib/nextalksession";
import { broadcastToChannel, createChannel, getConversations, subscribeToChannel, type Conversation } from "../../services/nextalkchat";
import Image from "next/image";
import { SectionHeader } from "../../components/nextalksectionheader";
import { SololaThemedLogo } from "../../components/sololathemedlogo";
import { publishStoryWithMedia } from "../../services/nextalkpublish";

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
  const router = useRouter();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ groupIdx: number; storyIdx: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [caption, setCaption] = useState("");
  const [storyVisibility, setStoryVisibility] = useState<"PUBLIC" | "FOLLOWERS">("PUBLIC");
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStatus, setPublishStatus] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeFile, setComposeFile] = useState<File | null>(null);
  const [composePreviewUrl, setComposePreviewUrl] = useState<string>("");
  const [channels, setChannels] = useState<Conversation[]>([]);
  const [channelTitle, setChannelTitle] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelMessage, setChannelMessage] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
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

  useEffect(() => {
    getConversations({ archived: false })
      .then((rows) => {
        const list = rows.filter((conversation) => conversation.kind === "GROUP");
        setChannels(list);
        if (list[0]) {
          setSelectedChannelId(list[0].id);
        }
      })
      .catch(() => setChannels([]));
  }, []);

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
      if (!["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
        setPublishStatus("Format non supporte. Utilisez JPEG, PNG, WEBP, HEIC, MP4, MOV ou WEBM.");
        return;
      }
      await publishStoryWithMedia({
        mediaFile: file,
        caption,
        visibility: storyVisibility,
        onUploadProgress: (percent) => {
          setPublishProgress(percent);
        }
      });
      setCaption("");
      setPublishStatus("Story publiee.");
      setPublishProgress(0);
      await loadFeed();
    } catch (error: any) {
      const message = String(error?.response?.data?.message ?? "");
      setPublishStatus(message ? `Échec de publication: ${message}` : "Échec de publication: serveur indisponible.");
    } finally {
      setPublishing(false);
      setPublishProgress(0);
    }
  };

  const currentGroup = viewer ? groups[viewer.groupIdx] : null;
  const currentStory = currentGroup ? currentGroup.stories[viewer!.storyIdx] : null;
  const isVideo = currentStory?.mediaType === "VIDEO";

  const downloadStory = (story: Story) => {
    const anchor = document.createElement("a");
    anchor.href = story.mediaUrl;
    anchor.download = `nextalk-story-${story.id}.${story.mediaType === "VIDEO" ? "mp4" : "jpg"}`;
    anchor.click();
  };

  const createChannelNow = async () => {
    if (!channelTitle.trim()) {
      return null;
    }
    try {
      const csrf = await fetchCsrfToken();
      const created = await createChannel(
        { title: channelTitle.trim(), description: channelDescription.trim() || undefined, isPublic: true },
        csrf
      );
      await subscribeToChannel(created.id, csrf);
      setChannels((prev) => [created, ...prev]);
      setSelectedChannelId(created.id);
      setChannelTitle("");
      setChannelDescription("");
      setPublishStatus("Canal cree avec succes.");
      return created.id;
    } catch {
      setPublishStatus("Creation du canal impossible pour le moment.");
      return null;
    }
  };

  const subscribeNow = async (channelId: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await subscribeToChannel(channelId, csrf);
      setPublishStatus("Abonnement au canal effectue.");
    } catch {
      setPublishStatus("Echec abonnement canal.");
    }
  };

  const sendBroadcast = async () => {
    if (!selectedChannelId || !channelMessage.trim()) {
      return;
    }
    try {
      const csrf = await fetchCsrfToken();
      await broadcastToChannel(selectedChannelId, { text: channelMessage.trim(), type: "TEXT" }, csrf);
      setChannelMessage("");
      setPublishStatus("Message diffuse dans le canal.");
    } catch {
      setPublishStatus("Diffusion canal indisponible.");
    }
  };

  useEffect(() => {
    return () => {
      if (composePreviewUrl) {
        URL.revokeObjectURL(composePreviewUrl);
      }
    };
  }, [composePreviewUrl]);

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
        <div className="flex items-center justify-between gap-3">
          <SectionHeader
            title="Stories et canaux"
            accent="violet"
          />
          <SololaThemedLogo width={40} height={40} className="rounded-xl opacity-95" />
        </div>
        {/* Barre stories */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide">
          {/* Ajouter une story */}
          <button
            onClick={() => {
              setComposeOpen(true);
              setPublishStatus("");
              setPublishProgress(0);
              setComposeFile(null);
              if (composePreviewUrl) {
                URL.revokeObjectURL(composePreviewUrl);
              }
              setComposePreviewUrl("");
            }}
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            aria-label="Choisir photo ou video"
            title="Choisir photo ou video"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (!f) return;
              setComposeFile(f);
              if (composePreviewUrl) {
                URL.revokeObjectURL(composePreviewUrl);
              }
              setComposePreviewUrl(URL.createObjectURL(f));
            }}
          />

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
          <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium ${publishStatus.includes("publiee") || publishStatus.includes("succes") ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 text-[#ff4d4f]"}`}>
            {publishStatus}
          </div>
        )}
        {publishing && publishProgress > 0 ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="h-2 w-full rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-neoblue transition-all" style={{ width: `${publishProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-300">Upload story: {publishProgress}%</p>
          </div>
        ) : null}

        {composeOpen ? (
          <div className="mb-6 glass rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Publication story</p>
                <p className="mt-1 text-sm text-slate-300">Ajoute une légende, choisis la visibilité, puis sélectionne une photo/vidéo.</p>
              </div>
              <button
                onClick={() => {
                  setComposeOpen(false);
                  setComposeFile(null);
                  if (composePreviewUrl) {
                    URL.revokeObjectURL(composePreviewUrl);
                  }
                  setComposePreviewUrl("");
                }}
                className="wa-pill px-3 py-1.5 text-xs"
                type="button"
              >
                Fermer
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Légende</p>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
                  placeholder="Ajoute une légende..."
                  disabled={publishing}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Visibilité</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStoryVisibility("PUBLIC")}
                    className={`rounded-xl px-3 py-2 text-xs ${storyVisibility === "PUBLIC" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                    type="button"
                    disabled={publishing}
                  >
                    Publique
                  </button>
                  <button
                    onClick={() => setStoryVisibility("FOLLOWERS")}
                    className={`rounded-xl px-3 py-2 text-xs ${storyVisibility === "FOLLOWERS" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                    type="button"
                    disabled={publishing}
                  >
                    Abonnés
                  </button>
                </div>
              </div>
              <div className="flex items-end justify-end gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-outline-neon rounded-xl px-4 py-2 text-sm disabled:opacity-60"
                  type="button"
                  disabled={publishing}
                >
                  Choisir photo/vidéo
                </button>
                <button
                  onClick={async () => {
                    if (!composeFile || publishing) return;
                    await publishStory(composeFile);
                    if (String(publishStatus).includes("publiee")) {
                      setComposeOpen(false);
                      setComposeFile(null);
                      if (composePreviewUrl) {
                        URL.revokeObjectURL(composePreviewUrl);
                      }
                      setComposePreviewUrl("");
                    }
                  }}
                  className="btn-neon rounded-xl px-4 py-2 text-sm disabled:opacity-60"
                  type="button"
                  disabled={!composeFile || publishing}
                >
                  {publishing ? "Publication..." : "Publier"}
                </button>
              </div>
            </div>

            {composePreviewUrl ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {composeFile?.type.startsWith("video/") ? (
                  <video src={composePreviewUrl} controls className="max-h-[520px] w-full object-cover" />
                ) : (
                  <img src={composePreviewUrl} alt="Prévisualisation story" className="max-h-[520px] w-full object-cover" />
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Appuie sur “Choisir photo/vidéo” (bouton +) pour sélectionner le fichier.</p>
            )}
          </div>
        ) : null}

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
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadStory(s);
                      }}
                      className="absolute right-2 bottom-2 z-10 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white"
                    >
                      Download
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8ef0b9]">Canaux / Chaines</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Créer un canal</h3>
            <p className="mt-2 text-sm text-slate-400">Ouvre la fenêtre de création pour ajouter un canal ou un groupe.</p>
            <button
              onClick={() => setCreateChannelModalOpen(true)}
              className="btn-neon mt-3 rounded-xl px-4 py-2 text-sm"
              type="button"
            >
              Creer un canal
            </button>
          </div>

          <div className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8ef0b9]">Diffusion canal</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Publier dans un canal</h3>
            <p className="mt-2 text-sm text-slate-400">Ouvre la fenêtre de diffusion pour publier dans un canal existant.</p>
            <button
              onClick={() => setBroadcastModalOpen(true)}
              className="btn-neon mt-3 rounded-xl px-4 py-2 text-sm"
              type="button"
            >
              Publier
            </button>
          </div>
        </div>

        {createChannelModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
            <div className="glass w-full max-w-lg rounded-3xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SololaThemedLogo width={24} height={24} className="rounded-md" />
                  <h4 className="text-base font-semibold text-white">Créer un canal</h4>
                </div>
                <button onClick={() => setCreateChannelModalOpen(false)} className="wa-pill px-3 py-1 text-xs" type="button">Fermer</button>
              </div>
              <input
                value={channelTitle}
                onChange={(event) => setChannelTitle(event.target.value)}
                placeholder="Nom du canal"
                className="input-neon mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
              <textarea
                value={channelDescription}
                onChange={(event) => setChannelDescription(event.target.value)}
                placeholder="Description"
                rows={3}
                className="input-neon mt-2 w-full rounded-xl px-3 py-2 text-sm"
              />
              <button
                onClick={async () => {
                  const createdId = await createChannelNow();
                  if (createdId) {
                    setCreateChannelModalOpen(false);
                    router.push(`/messages/${createdId}`);
                  }
                }}
                className="btn-neon mt-3 rounded-xl px-4 py-2 text-sm"
                type="button"
              >
                Creer le canal
              </button>
            </div>
          </div>
        ) : null}

        {broadcastModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
            <div className="glass w-full max-w-xl rounded-3xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SololaThemedLogo width={24} height={24} className="rounded-md" />
                  <h4 className="text-base font-semibold text-white">Publier dans un canal</h4>
                </div>
                <button onClick={() => setBroadcastModalOpen(false)} className="wa-pill px-3 py-1 text-xs" type="button">Fermer</button>
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <button onClick={() => setSelectedChannelId(channel.id)} className="text-left text-sm text-white" type="button">
                      {channel.title}
                    </button>
                    <button onClick={() => void subscribeNow(channel.id)} className="wa-pill px-2 py-1 text-xs" type="button">
                      Suivre
                    </button>
                  </div>
                ))}
                {channels.length === 0 ? <p className="text-sm text-slate-400">Aucun canal disponible.</p> : null}
              </div>
              <textarea
                value={channelMessage}
                onChange={(event) => setChannelMessage(event.target.value)}
                placeholder="Message a diffuser dans le canal selectionne"
                rows={3}
                className="input-neon mt-3 w-full rounded-xl px-3 py-2 text-sm"
              />
              <button
                onClick={async () => {
                  await sendBroadcast();
                  setBroadcastModalOpen(false);
                }}
                className="btn-neon mt-3 rounded-xl px-4 py-2 text-sm"
                type="button"
              >
                Publier
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}
