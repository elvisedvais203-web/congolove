"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/nextalkauthguard";
import { SectionHeader } from "../../components/nextalksectionheader";
import { getStoryFeed } from "../../services/nextalkstories";

type ReelItem = {
  id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
  user?: { profile?: { displayName?: string } };
};

export default function ReelsPage() {
  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoryFeed()
      .then((rows) => {
        const onlyVideos = (rows ?? []).filter((row: ReelItem) => row.mediaType === "VIDEO");
        setItems(onlyVideos);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <section className="space-y-4 pb-20 animate-fade-in">
        <SectionHeader title="Reels" accent="violet" />

        {loading ? <div className="glass rounded-3xl p-4 text-sm text-slate-300">Chargement des reels...</div> : null}

        {!loading && items.length === 0 ? (
          <div className="glass rounded-3xl p-6 text-center text-sm text-slate-400">Aucun reel disponible pour le moment.</div>
        ) : null}

        <div className="h-[78vh] snap-y snap-mandatory overflow-y-auto rounded-3xl">
          {items.map((item) => (
            <article key={item.id} className="glass mb-4 snap-start overflow-hidden rounded-3xl border border-white/10">
              <video src={item.mediaUrl} controls playsInline muted loop className="h-[70vh] w-full object-cover" />
              <div className="p-3">
                <p className="text-sm font-semibold text-white">{item.user?.profile?.displayName ?? "Utilisateur"}</p>
                {item.caption ? <p className="mt-1 text-sm text-slate-300">{item.caption}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AuthGuard>
  );
}
