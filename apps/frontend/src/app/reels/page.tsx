"use client";

import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "../../components/nextalkauthguard";
import { SectionHeader } from "../../components/nextalksectionheader";
import { commentFeedPost, getFeed, likeFeedPost } from "../../services/nextalksocial";
import { fetchCsrfToken } from "../../services/nextalksecurity";
import { SololaThemedLogo } from "../../components/sololathemedlogo";

type ReelItem = {
  id: string;
  mediaUrl: string;
  content: string;
  author: { displayName: string };
  likesCount: number;
  likedByMe: boolean;
  comments: { id: string; content: string; user: { displayName: string } }[];
};

export default function ReelsPage() {
  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    getFeed(40)
      .then((rows) => {
        const onlyVideos = (rows ?? []).filter((row: any) => {
          const url = String(row?.mediaUrl ?? "");
          return Boolean(url) && /\.(mp4|webm|ogg)(\?|$)/i.test(url);
        });
        setItems(onlyVideos);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLVideoElement).dataset.id;
          if (!id) return;
          const video = videoRefs.current[id];
          if (!video) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            setActiveId(id);
            void video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0.2, 0.7, 1] }
    );

    Object.values(videoRefs.current).forEach((v) => {
      if (v) observer.observe(v);
    });
    return () => observer.disconnect();
  }, [items]);

  const onLike = async (id: string) => {
    try {
      const csrf = await fetchCsrfToken();
      const result = await likeFeedPost(id, csrf);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                likedByMe: Boolean(result?.liked ?? !item.likedByMe),
                likesCount: item.likesCount + (item.likedByMe ? -1 : 1)
              }
            : item
        )
      );
    } catch {
      setStatus("Like indisponible.");
    }
  };

  const onComment = async (id: string) => {
    const content = String(commentDrafts[id] ?? "").trim();
    if (!content) return;
    try {
      const csrf = await fetchCsrfToken();
      await commentFeedPost(id, content, csrf);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                comments: [...item.comments, { id: `local-${Date.now()}`, content, user: { displayName: "Moi" } }]
              }
            : item
        )
      );
      setCommentDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch {
      setStatus("Commentaire indisponible.");
    }
  };

  const onShare = async (id: string) => {
    const url = `${window.location.origin}/reels?reel=${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Reel Solola", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setStatus("Lien partage/copie.");
    } catch {
      setStatus("Partage indisponible.");
    }
  };

  return (
    <AuthGuard>
      <section className="space-y-4 pb-20 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader title="Reels" accent="violet" />
          <SololaThemedLogo width={40} height={40} className="rounded-xl opacity-95" />
        </div>

        {loading ? <div className="glass rounded-3xl p-4 text-sm text-slate-300">Chargement des reels...</div> : null}

        {!loading && items.length === 0 ? (
          <div className="glass rounded-3xl p-6 text-center text-sm text-slate-400">Aucun reel disponible pour le moment.</div>
        ) : null}

        {status ? <div className="glass rounded-2xl px-3 py-2 text-xs text-slate-300">{status}</div> : null}

        <div className="h-[78vh] snap-y snap-mandatory overflow-y-auto rounded-3xl">
          {items.map((item) => (
            <article key={item.id} className="glass mb-4 snap-start overflow-hidden rounded-3xl border border-white/10">
              <video
                ref={(el) => {
                  videoRefs.current[item.id] = el;
                }}
                data-id={item.id}
                src={item.mediaUrl}
                controls
                playsInline
                muted
                loop
                className="h-[70vh] w-full object-cover"
              />
              <div className="p-3">
                <p className="text-sm font-semibold text-white">{item.author?.displayName ?? "Utilisateur"}</p>
                {item.content ? <p className="mt-1 text-sm text-slate-300">{item.content}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => void onLike(item.id)} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                    {item.likedByMe ? "J'aime deja" : "J'aime"} ({item.likesCount})
                  </button>
                  <button type="button" onClick={() => void onShare(item.id)} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                    Partager
                  </button>
                  <span className="text-xs text-slate-400">{activeId === item.id ? "Lecture auto" : "Pause"}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={commentDrafts[item.id] ?? ""}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Ajouter un commentaire"
                    className="input-neon w-full rounded-xl px-3 py-2 text-xs"
                  />
                  <button type="button" onClick={() => void onComment(item.id)} className="rounded-xl bg-neoblue px-3 py-2 text-xs font-semibold text-[#07101f]">
                    Envoyer
                  </button>
                </div>
                {item.comments?.length ? (
                  <p className="mt-2 text-xs text-slate-400">Commentaires: {item.comments.length}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AuthGuard>
  );
}
