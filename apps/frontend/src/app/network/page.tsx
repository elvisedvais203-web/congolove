"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { followUser, getNetwork, getSuggestions, unfollowUser } from "../../services/social";
import { fetchCsrfToken } from "../../services/security";
import { AuthGuard } from "../../components/AuthGuard";

export default function NetworkPage() {
  const [network, setNetwork] = useState<any>({ followers: [], following: [] });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    const [n, s] = await Promise.all([getNetwork(), getSuggestions(8)]);
    setNetwork(n);
    setSuggestions(s);
  };

  useEffect(() => {
    load();
  }, []);

  const follow = async (id: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await followUser(id, csrf);
      setStatus("Abonnement effectue");
      await load();
    } catch {
      setStatus("Echec d'abonnement. Veuillez reessayer.");
    }
  };

  const unfollow = async (id: string) => {
    try {
      const csrf = await fetchCsrfToken();
      await unfollowUser(id, csrf);
      setStatus("Desabonnement effectue");
      await load();
    } catch {
      setStatus("Echec de desabonnement. Veuillez reessayer.");
    }
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Reseau" subtitle="Followers, following et suggestions" />
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <article className="glass rounded-2xl p-4">
            <h2 className="font-heading text-lg">Followers</h2>
            <p className="mt-2 text-sm text-slate-300">{network.followers.length} abonnes</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <h2 className="font-heading text-lg">Following</h2>
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
        <p className="mt-3 text-sm text-gold">{status}</p>
      </section>
    </AuthGuard>
  );
}
