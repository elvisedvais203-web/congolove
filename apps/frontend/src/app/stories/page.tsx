"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { createStory, getStoryFeed } from "../../services/stories";
import { fetchCsrfToken } from "../../services/security";
import { AuthGuard } from "../../components/AuthGuard";

export default function StoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState("");

  const loadFeed = async () => {
    try {
      const data = await getStoryFeed();
      setStories(data);
    } catch {
      setStories([]);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const publish = async () => {
    if (!mediaUrl.trim()) {
      setStatus("Veuillez ajouter une URL media");
      return;
    }

    try {
      const csrf = await fetchCsrfToken();
      await createStory({ mediaUrl, mediaType: "IMAGE", caption }, csrf);
      setMediaUrl("");
      setCaption("");
      setStatus("Story publiee");
      await loadFeed();
    } catch {
      setStatus("Echec de publication. Verifiez votre connexion et reessayez.");
    }
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Stories" subtitle="Publiez des statuts photo/video visibles 24h" />
        <div className="glass mb-5 rounded-2xl p-4">
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
            placeholder="URL image/video"
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
            placeholder="Legende"
          />
          <button onClick={publish} className="mt-3 rounded-xl bg-neoviolet px-4 py-2 font-semibold text-white">
            Publier story
          </button>
          <p className="mt-2 text-sm text-gold">{status}</p>
        </div>
        <div className="space-y-3">
          {stories.map((s) => (
            <article key={s.id} className="glass rounded-2xl p-4">
              <p className="text-sm text-slate-300">{s.user?.profile?.displayName ?? "User"}</p>
              <p className="mt-2 text-sm">{s.caption ?? "Story"}</p>
              <a href={s.mediaUrl} target="_blank" className="mt-2 inline-block text-neoblue" rel="noreferrer">
                Ouvrir media
              </a>
            </article>
          ))}
        </div>
      </section>
    </AuthGuard>
  );
}
