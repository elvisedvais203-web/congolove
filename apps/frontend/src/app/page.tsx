"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { type StoryItem } from "../components/nextalkstorybar";
import { commentFeedPost, createFeedPost, getFeed, likeFeedPost, saveFeedPost } from "../services/nextalksocial";
import { createStory, getStoryFeed } from "../services/nextalkstories";
import { fetchCsrfToken } from "../services/nextalksecurity";
import api from "../lib/nextalkapi";

type FeedComment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl?: string | null };
};

type FeedPost = {
  id: string;
  content: string;
  mediaUrl?: string | null;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl?: string | null };
  likesCount: number;
  likedByMe: boolean;
  savedByMe?: boolean;
  comments: FeedComment[];
};

function toStoryItems(raw: any[]): StoryItem[] {
  return (raw ?? []).map((s) => ({
    id: s.id,
    userId: s.userId,
    name: s.user?.profile?.displayName ?? s.user?.phone ?? "Utilisateur",
    avatar: s.user?.photos?.[0]?.url ?? undefined,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType,
    caption: s.caption ?? "",
    expiresAt: s.expiresAt,
    viewCount: s._count?.viewers ?? 0
  }));
}

export default function HomePage() {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [status, setStatus] = useState("");
  const [postMediaFile, setPostMediaFile] = useState<File | null>(null);
  const [postMediaPreview, setPostMediaPreview] = useState<string | null>(null);
  const [postUploadProgress, setPostUploadProgress] = useState(0);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openCommentsFor, setOpenCommentsFor] = useState<Record<string, boolean>>({});
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [storyPublishing, setStoryPublishing] = useState(false);
  const [storyUploadProgress, setStoryUploadProgress] = useState(0);
  const storyInputRef = useRef<HTMLInputElement | null>(null);
  const storyGroups = useMemo(() => {
    const map = new Map<string, StoryItem>();
    for (const s of stories) {
      if (!map.has(s.userId)) map.set(s.userId, s);
    }
    return [...map.values()];
  }, [stories]);

  const feedEmpty = useMemo(() => feed.length === 0, [feed.length]);
  const triggerHaptic = (ms = 10) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  };

  const loadAll = async () => {
    try {
      setLoadingFeed(true);
      const [feedRows, storyRows] = await Promise.all([getFeed(25), getStoryFeed()]);
      setFeed(feedRows ?? []);
      setStories(toStoryItems(storyRows ?? []));
    } catch {
      setStatus("Connecte-toi pour voir ton fil et tes stories.");
      setFeed([]);
      setStories([]);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    let startY = 0;
    let pulling = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startY = e.touches[0]?.clientY ?? 0;
      pulling = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const currentY = e.touches[0]?.clientY ?? 0;
      const delta = currentY - startY;
      if (delta <= 0) return;
      setPullDistance(Math.min(110, delta * 0.45));
    };

    const onTouchEnd = () => {
      if (!pulling) return;
      pulling = false;
      const shouldRefresh = pullDistance > 70;
      setPullDistance(0);
      if (shouldRefresh) {
        setRefreshing(true);
        void loadAll().finally(() => setRefreshing(false));
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing]);

  const publishPost = async () => {
    const content = composer.trim();
    if ((!content && !postMediaFile) || busy) return;
    try {
      setBusy(true);
      const csrf = await fetchCsrfToken();
      let mediaUrl: string | undefined;
      if (postMediaFile) {
        const formData = new FormData();
        formData.append("file", postMediaFile);
        formData.append("folder", postMediaFile.type.startsWith("video/") ? "reels" : "posts");
        const { data: upload } = await api.post("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf },
          onUploadProgress: (evt) => {
            const total = evt.total ?? 0;
            if (total > 0) {
              setPostUploadProgress(Math.round((evt.loaded / total) * 100));
            }
          }
        });
        mediaUrl = upload?.url;
      }
      await createFeedPost({ content: content || "Nouvelle publication", mediaUrl }, csrf);
      setComposer("");
      setPostMediaFile(null);
      setPostMediaPreview(null);
      setPostUploadProgress(0);
      setStatus("Publication envoyée.");
      setFeed((prev) => [
        {
          id: `local-${Date.now()}`,
          content,
          createdAt: new Date().toISOString(),
          author: { id: "me", displayName: "Moi" },
          likesCount: 0,
          likedByMe: false,
          savedByMe: false,
          comments: []
        },
        ...prev
      ]);
      void loadAll();
    } catch {
      setStatus("Impossible de publier pour le moment.");
    } finally {
      setBusy(false);
      setPostUploadProgress(0);
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      triggerHaptic(8);
      const csrf = await fetchCsrfToken();
      await likeFeedPost(postId, csrf);
      setFeed((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likesCount + (p.likedByMe ? -1 : 1) }
            : p
        )
      );
    } catch {
      setStatus("Like indisponible.");
    }
  };

  const sendComment = async (postId: string) => {
    const content = (commentDrafts[postId] ?? "").trim();
    if (!content) return;
    try {
      const csrf = await fetchCsrfToken();
      await commentFeedPost(postId, content, csrf);
      const localComment: FeedComment = {
        id: `local-comment-${Date.now()}`,
        content,
        createdAt: new Date().toISOString(),
        user: { id: "me", displayName: "Moi" }
      };
      setFeed((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, comments: [...post.comments, localComment] } : post
        )
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    } catch {
      setStatus("Commentaire indisponible.");
    }
  };

  const toggleSave = async (postId: string) => {
    try {
      triggerHaptic(8);
      const csrf = await fetchCsrfToken();
      const result = await saveFeedPost(postId, csrf);
      setFeed((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, savedByMe: Boolean(result?.saved ?? !p.savedByMe) }
            : p
        )
      );
    } catch {
      setStatus("Enregistrement indisponible.");
    }
  };

  const copyPostLink = async (postId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?post=${postId}`);
      setStatus("Lien copié.");
    } catch {
      setStatus("Impossible de copier le lien.");
    }
  };

  const publishMyStory = async (file: File) => {
    try {
      setStoryPublishing(true);
      setStoryUploadProgress(0);
      const csrf = await fetchCsrfToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "stories");
      const { data: upload } = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf },
        onUploadProgress: (evt) => {
          const total = evt.total ?? 0;
          if (total > 0) {
            setStoryUploadProgress(Math.round((evt.loaded / total) * 100));
          }
        }
      });
      const mediaUrl = String(upload?.url ?? upload?.secure_url ?? upload?.mediaUrl ?? "");
      if (!mediaUrl) {
        throw new Error("upload_missing_url");
      }
      await createStory(
        {
          mediaUrl,
          mediaType: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
          visibility: "PUBLIC"
        },
        csrf
      );
      setStatus("Story publiée.");
      await loadAll();
    } catch {
      setStatus("Impossible de publier la story.");
    } finally {
      setStoryPublishing(false);
      setStoryUploadProgress(0);
    }
  };

  return (
    <section className="space-y-4 py-2 md:py-3">
      <div
        className="pointer-events-none mx-auto max-w-xl overflow-hidden rounded-full transition-all"
        style={{ height: pullDistance > 0 || refreshing ? 34 : 0 }}
      >
        <div className="mx-4 flex h-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-300">
          {refreshing ? "Actualisation..." : pullDistance > 60 ? "Relâche pour actualiser" : "Tire pour actualiser"}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="glass rounded-3xl p-4">
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide">
              <button
                onClick={() => storyInputRef.current?.click()}
                className="flex min-w-[72px] flex-col items-center gap-2 text-xs text-slate-300"
                disabled={storyPublishing}
                type="button"
              >
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-neoblue/60 bg-neoblue/10">
                  {storyPublishing ? (
                    <svg className="h-6 w-6 animate-spin text-neoblue" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-neoblue" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  )}
                </span>
                <span className="font-medium text-neoblue">Ma story</span>
              </button>

              {storyGroups.map((s) => (
                <Link key={s.id} href="/stories" className="flex min-w-[72px] flex-col items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full bg-gradient-to-br from-[#ff3cac] via-neoblue to-neoviolet p-[2.5px]">
                    <span className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full bg-[#06070e]">
                      {s.avatar ? (
                        <img src={s.avatar} alt={s.name} className="h-full w-full rounded-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-lg font-bold text-white">{s.name[0]?.toUpperCase()}</span>
                      )}
                    </span>
                  </span>
                  <span className="max-w-[68px] truncate font-medium">{s.name}</span>
                </Link>
              ))}
            </div>
            <input
              ref={storyInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void publishMyStory(file);
              }}
            />
            {storyPublishing && storyUploadProgress > 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-neoblue transition-all" style={{ width: `${storyUploadProgress}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-300">Upload story: {storyUploadProgress}%</p>
              </div>
            ) : null}
          </div>

          {loadingFeed ? (
            <div className="glass rounded-3xl p-4 text-sm text-slate-300">Chargement du feed...</div>
          ) : null}

          {feed.map((post, idx) => (
            <article
              key={post.id}
              className="glass card-hover card-enter rounded-3xl p-4"
              style={{ animationDelay: `${Math.min(idx * 40, 280)}ms` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{post.author.displayName}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(post.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button className="wa-pill px-3 py-1 text-xs">Suivre</button>
              </div>

              <p className="text-sm text-slate-100">{post.content}</p>
              {post.mediaUrl ? <img src={post.mediaUrl} alt="publication" loading="lazy" className="mt-3 max-h-[520px] w-full rounded-2xl object-cover" /> : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <button onClick={() => void toggleLike(post.id)} className={`wa-pill px-3 py-1 ${post.likedByMe ? "wa-pill-active" : ""}`}>
                  ❤️ {post.likesCount}
                </button>
                <button onClick={() => setOpenCommentsFor((prev) => ({ ...prev, [post.id]: !prev[post.id] }))} className={`wa-pill px-3 py-1 ${openCommentsFor[post.id] ? "wa-pill-active" : ""}`}>
                  💬 {post.comments.length}
                </button>
                <button onClick={() => void copyPostLink(post.id)} className="wa-pill px-3 py-1">↗ Partager</button>
                <button onClick={() => void toggleSave(post.id)} className={`wa-pill px-3 py-1 ${post.savedByMe ? "wa-pill-active" : ""}`}>
                  🔖 {post.savedByMe ? "Enregistré" : "Enregistrer"}
                </button>
              </div>

              {openCommentsFor[post.id] ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Commentaires</p>
                    <button
                      onClick={() => setOpenCommentsFor((prev) => ({ ...prev, [post.id]: false }))}
                      className="wa-pill px-2.5 py-1 text-[11px] text-slate-200"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-auto pr-1">
                    {post.comments.map((c) => (
                      <p key={c.id} className="text-xs text-slate-300">
                        <span className="font-semibold text-slate-100">{c.user.displayName} :</span> {c.content}
                      </p>
                    ))}
                    {post.comments.length === 0 ? <p className="text-xs text-slate-500">Aucun commentaire.</p> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {post.comments.slice(-2).map((c) => (
                    <p key={c.id} className="text-xs text-slate-300">
                      <span className="font-semibold text-slate-100">{c.user.displayName} :</span> {c.content}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  value={commentDrafts[post.id] ?? ""}
                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  placeholder="Ajouter un commentaire..."
                  className="input-neon flex-1 rounded-xl px-3 py-2 text-sm"
                />
                <button onClick={() => void sendComment(post.id)} className="btn-outline-neon rounded-xl px-3 py-2 text-sm">
                  Envoyer
                </button>
              </div>
            </article>
          ))}

          {feedEmpty ? (
            <div className="glass rounded-3xl p-8 text-center text-slate-300">
              Ton feed est vide. Ajoute des abonnements ou publie ton premier post.
            </div>
          ) : null}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          {status ? <div className="glass rounded-2xl p-3 text-xs text-gold">{status}</div> : null}
        </aside>
      </div>
    </section>
  );
}
