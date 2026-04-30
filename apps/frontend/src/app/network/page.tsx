"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/nextalksectionheader";
import { commentFeedPost, createFeedPost, followUser, getFeed, getNetwork, getSuggestions, likeFeedPost, unfollowUser } from "../../services/nextalksocial";
import { fetchCsrfToken } from "../../services/nextalksecurity";
import { AuthGuard } from "../../components/nextalkauthguard";

export default function NetworkPage() {
  const [network, setNetwork] = useState<any>({ followers: [], following: [] });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [postInput, setPostInput] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  const load = async () => {
    const [n, s, f] = await Promise.all([getNetwork(), getSuggestions(8), getFeed(20)]);
    setNetwork(n);
    setSuggestions(s);
    setFeed(f);
  };

  useEffect(() => {
    load();
  }, []);

  const follow = async (id: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await followUser(id, csrf);
      setStatus("Abonnement effectue.");
      await load();
    } catch {
      setStatus("Echec d'abonnement. Veuillez reessayer.");
    }
  };

  const unfollow = async (id: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await unfollowUser(id, csrf);
      setStatus("Desabonnement effectue.");
      await load();
    } catch {
      setStatus("Echec de desabonnement. Veuillez reessayer.");
    }
  };

  const publishPost = async () => {
    if (!postInput.trim()) {
      return;
    }
    try {
      const csrf = await fetchCsrfToken();
      await createFeedPost({ content: postInput.trim() }, csrf);
      setPostInput("");
      setStatus("Publication envoyee.");
      await load();
    } catch {
      setStatus("Echec de publication.");
    }
  };

  const likePost = async (postId: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await likeFeedPost(postId, csrf);
      await load();
    } catch {
      setStatus("Impossible de liker ce post.");
    }
  };

  const commentPost = async (postId: string) => {
    const content = String(commentDrafts[postId] ?? "").trim();
    if (!content) {
      return;
    }
    try {
      const csrf = await fetchCsrfToken();
      await commentFeedPost(postId, content, csrf);
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      await load();
    } catch {
      setStatus("Impossible d'ajouter le commentaire.");
    }
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Reseau" />
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <article className="glass rounded-2xl p-4">
            <h2 className="font-heading text-lg">Followers</h2>
            <p className="mt-2 text-sm text-slate-300">{network.followers.length} abonnes</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <h2 className="font-heading text-lg">Abonnements</h2>
            <p className="mt-2 text-sm text-slate-300">{network.following.length} abonnements</p>
          </article>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.map((item) => (
            <article key={item.userId} className="glass rounded-2xl p-4">
              <p className="font-heading text-lg">{item.displayName}</p>
              <p className="text-sm text-slate-300">{item.city ?? "RDC"}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => follow(item.userId)} className="rounded-xl bg-neoblue px-3 py-2 text-sm font-semibold text-[#041127]">
                  S abonner
                </button>
                <button onClick={() => unfollow(item.userId)} className="rounded-xl border border-white/20 px-3 py-2 text-sm text-slate-200">
                  Se desabonner
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 glass rounded-2xl p-4">
          <h2 className="font-heading text-lg">Feed global</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={postInput}
              onChange={(e) => setPostInput(e.target.value)}
              className="flex-1 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm"
              placeholder="Partager une publication..."
            />
            <button onClick={publishPost} className="rounded-xl bg-neoblue px-3 py-2 text-sm font-semibold text-[#041127]">Publier</button>
          </div>

          <div className="mt-4 space-y-3">
            {feed.map((post) => (
              <article key={post.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{post.author.displayName}</p>
                  <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString("fr-FR")}</p>
                </div>
                <p className="mt-2 text-sm text-slate-200">{post.content}</p>
                {post.mediaUrl ? <img src={post.mediaUrl} alt="media post" className="mt-2 max-h-72 w-full rounded-xl object-cover" /> : null}

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => void likePost(post.id)} className="rounded-xl border border-white/20 px-3 py-1.5 text-xs text-slate-200">
                    {post.likedByMe ? "Retirer le like" : "Liker"} ({post.likesCount})
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {post.comments.map((comment: any) => (
                    <div key={comment.id} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-200">
                      <span className="font-semibold">{comment.user.displayName}</span>: {comment.content}
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    value={commentDrafts[post.id] ?? ""}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    className="flex-1 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-xs"
                    placeholder="Ajouter un commentaire"
                  />
                  <button onClick={() => void commentPost(post.id)} className="rounded-xl border border-white/20 px-3 py-2 text-xs text-slate-200">Commenter</button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-gold">{status}</p>
      </section>
    </AuthGuard>
  );
}
