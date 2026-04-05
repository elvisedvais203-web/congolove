"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";
import { fetchCsrfToken } from "../../services/security";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get("/profile/me")
      .then((res) => setProfile(res.data))
      .catch(() =>
        setProfile({
          displayName: "Utilisateur",
          bio: "",
          city: "Kinshasa",
          interests: []
        })
      );
  }, []);

  const save = async () => {
    try {
      const csrf = await fetchCsrfToken();
      await api.patch(
        "/profile/me",
        {
          displayName: profile?.displayName,
          bio: profile?.bio,
          city: profile?.city,
          interests: profile?.interests ?? []
        },
        { headers: { "x-csrf-token": csrf } }
      );
      setStatus("Profil mis a jour");
    } catch {
      setStatus("Echec de mise a jour du profil. Veuillez reessayer.");
    }
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Profil" subtitle="Edition profile + badge verification + reputation" />
        <div className="glass rounded-3xl p-5">
          <p className="text-sm text-slate-300">Nom</p>
          <input
            value={profile?.displayName ?? ""}
            onChange={(e) => setProfile((p: any) => ({ ...p, displayName: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          />
          <p className="mt-4 text-sm text-slate-300">Bio</p>
          <textarea
            value={profile?.bio ?? ""}
            onChange={(e) => setProfile((p: any) => ({ ...p, bio: e.target.value }))}
            className="mt-1 min-h-24 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          />
          <button onClick={save} className="mt-3 rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
            Enregistrer
          </button>
          <p className="mt-2 text-sm text-gold">{status}</p>
        </div>
      </section>
    </AuthGuard>
  );
}
