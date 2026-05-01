"use client";

import Link from "next/link";
import { StoryBar, type StoryItem } from "../../components/nextalkstorybar";
import { AuthGuard } from "../../components/nextalkauthguard";
import { useEffect, useMemo, useState } from "react";
import { getStoryFeed } from "../../services/nextalkstories";
import { getStoredUser } from "../../lib/nextalksession";
import {
  commentFeedPost,
  createFeedPost,
  getFeed,
  getSuggestions,
  likeFeedPost
} from "../../services/nextalksocial";
import { fetchCsrfToken } from "../../services/nextalksecurity";

export default function DashboardPage() {
  const [storyItems, setStoryItems] = useState<StoryItem[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [postInput, setPostInput] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const me = typeof window !== "undefined" ? getStoredUser() : null;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [stories, posts, sugg] = await Promise.all([
          getStoryFeed().catch(() => []),
          getFeed(25).catch(() => []),
          getSuggestions(8).catch(() => [])
        ]);

        const items: StoryItem[] = (stories as any[]).map((s) => ({
          id: s.id,
          userId: s.user?.id ?? s.userId,
          name: s.user?.profile?.displayName ?? s.user?.username ?? "Utilisateur",
          avatar: s.user?.profile?.avatarUrl ?? undefined,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType ?? "IMAGE",
          caption: s.caption ?? undefined,
          expiresAt: s.expiresAt,
          viewCount: s.viewCount ?? undefined
        }));
        setStoryItems(items);
        setFeed(posts as any[]);
        setSuggestions(sugg as any[]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const canPublish = postInput.trim().length > 0;
  const cleanedName = useMemo(() => me?.email?.split("@")[0] ?? me?.phone ?? "Vous", [me?.email, me?.phone]);

  const publish = async () => {
    if (!canPublish) return;
    try {
      const csrf = await fetchCsrfToken();
      await createFeedPost({ content: postInput.trim() }, csrf);
      setPostInput("");
      setStatus("Publication envoyee.");
      const posts = await getFeed(25);
      setFeed(posts as any[]);
    } catch {
      setStatus("Echec de publication.");
    }
  };

  const like = async (postId: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await likeFeedPost(postId, csrf);
      const posts = await getFeed(25);
      setFeed(posts as any[]);
    } catch {
      setStatus("Like impossible.");
    }
  };

  const comment = async (postId: string) => {
    const content = String(commentDrafts[postId] ?? "").trim();
    if (!content) return;
    try {
      const csrf = await fetchCsrfToken();
      await commentFeedPost(postId, content, csrf);
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      const posts = await getFeed(25);
      setFeed(posts as any[]);
    } catch {
      setStatus("Commentaire impossible.");
    }
  };

  return (
    <AuthGuard>
      <section className="mx-auto grid max-w-6xl gap-6 pb-8 lg:grid-cols-[1fr_360px] animate-fade-in">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Bonjour</p>
              <h1 className="mt-1 font-heading text-2xl font-bold text-white">{cleanedName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/stories" className="wa-pill px-3 py-2 text-xs">Stories</Link>
              <Link href="/messages" className="wa-pill wa-pill-active px-3 py-2 text-xs font-semibold">Inbox</Link>
            </div>
          </div>

          {storyItems.length > 0 ? (
            <div className="glass rounded-3xl p-4">
              <StoryBar items={storyItems} />
            </div>
          ) : null}

          <div className="mt-4 glass rounded-3xl p-4">
            <div className="flex items-center gap-2">
              <input
                value={postInput}
                onChange={(e) => setPostInput(e.target.value)}
                className="input-neon flex-1 rounded-2xl px-4 py-3 text-sm"
                placeholder="Partager une publication..."
              />
              <button
                onClick={() => void publish()}
                disabled={!canPublish}
                className="rounded-2xl bg-[#38d37f] px-4 py-3 text-sm font-semibold text-[#05101f] disabled:opacity-50"
              >
                Publier
              </button>
            </div>
            {status ? <p className="mt-2 text-xs text-slate-300">{status}</p> : null}
          </div>

          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="glass rounded-3xl p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-64 animate-pulse rounded-2xl bg-white/10" />
              </div>
            ) : null}

            {!loading && feed.length === 0 ? (
              <div className="glass rounded-3xl p-6 text-center text-slate-300">
                Aucun post pour le moment. Publie quelque chose pour demarrer le feed.
              </div>
            ) : null}

            {!loading &&
              feed.map((post) => (
                <article key={post.id} className="glass rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-bold text-white">
                        {(post.author?.displayName ?? "U")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{post.author?.displayName ?? "Utilisateur"}</p>
                        <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString("fr-FR")}</p>
                      </div>
                    </div>
                    <button className="wa-pill px-3 py-1 text-xs">...</button>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{post.content}</p>
                  {post.mediaUrl ? (
                    <img src={post.mediaUrl} alt="media post" className="mt-3 max-h-[520px] w-full rounded-2xl object-cover" />
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => void like(post.id)} className="wa-pill px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span className={post.likedByMe ? "text-rose-300" : "text-slate-100"}>♥</span>
                        {post.likesCount ?? 0}
                      </span>
                    </button>
                    <button className="wa-pill px-3 py-2 text-xs" type="button">
                      <span className="inline-flex items-center gap-2">
                        <span>💬</span>
                        {Array.isArray(post.comments) ? post.comments.length : 0}
                      </span>
                    </button>
                    <Link href="/messages" className="wa-pill px-3 py-2 text-xs">
                      ↗ Partager
                    </Link>
                  </div>

                  {Array.isArray(post.comments) && post.comments.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {post.comments.slice(0, 3).map((comment: any) => (
                        <div key={comment.id} className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-slate-200">
                          <span className="font-semibold">{comment.user?.displayName ?? "User"}</span>: {comment.content}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 flex gap-2">
                    <input
                      value={commentDrafts[post.id] ?? ""}
                      onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      className="input-neon flex-1 rounded-2xl px-3 py-2 text-xs"
                      placeholder="Ajouter un commentaire"
                    />
                    <button onClick={() => void comment(post.id)} className="wa-pill wa-pill-active px-3 py-2 text-xs font-semibold">
                      Envoyer
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Suggestions</p>
            <div className="mt-3 space-y-2">
              {suggestions.map((item) => (
                <div key={item.userId} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.displayName}</p>
                    <p className="text-xs text-slate-400">{item.city ?? "RDC"}</p>
                  </div>
                  <Link href="/network" className="wa-pill wa-pill-active px-3 py-2 text-xs font-semibold">
                    Voir
                  </Link>
                </div>
              ))}
              {suggestions.length === 0 ? <p className="text-sm text-slate-400">Aucune suggestion.</p> : null}
            </div>
          </div>

          <div className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Raccourcis</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Link href="/messages" className="wa-pill wa-pill-active px-3 py-2 text-center font-semibold">
                Inbox
              </Link>
              <Link href="/stories" className="wa-pill px-3 py-2 text-center">
                Stories
              </Link>
              <Link href="/discover" className="wa-pill px-3 py-2 text-center">
                Explorer
              </Link>
              <Link href="/settings" className="wa-pill px-3 py-2 text-center">
                Reglages
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </AuthGuard>
  );
}