"use client";

import { useEffect, useState } from "react";
import { ProfileCard } from "../../components/ProfileCard";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";

const fallback = [
  {
    profile: {
      displayName: "Merveille",
      city: "Lubumbashi",
      bio: "Passionnee de design et voyage",
      interests: ["design", "voyage"],
      user: { photos: [{ url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1" }] }
    }
  }
];

export default function DiscoverPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/matching/discover?limit=10")
      .then((res) => setItems(res.data))
      .catch(() => setItems(fallback));
  }, []);

  const top = items[0]?.profile;

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Decouverte" subtitle="Swipe intelligent base sur geolocalisation, interets et activite" />
        {top ? (
          <div className="mx-auto max-w-md">
            <ProfileCard
              displayName={top.displayName}
              city={top.city}
              bio={top.bio}
              imageUrl={top.user.photos?.[0]?.url ?? "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"}
              interests={top.interests ?? []}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="rounded-2xl border border-red-400/40 bg-red-500/10 py-3 text-red-200">Passer</button>
              <button className="rounded-2xl border border-neoblue/40 bg-neoblue/20 py-3 text-neoblue">Like</button>
            </div>
          </div>
        ) : (
          <p className="text-slate-300">Aucun profil pour le moment.</p>
        )}
      </section>
    </AuthGuard>
  );
}
