"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { AuthGuard } from "../../components/AuthGuard";
import { fetchCsrfToken } from "../../services/security";

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture video impossible"));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [interestInput, setInterestInput] = useState("");
  const [relationshipGoal, setRelationshipGoal] = useState<"MARRIAGE" | "SERIOUS" | "FRIENDSHIP" | "FUN">("SERIOUS");
  const [verificationStatement, setVerificationStatement] = useState("Je confirme etre la vraie personne presente sur ce compte.");
  const [selfieVideoUrl, setSelfieVideoUrl] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);

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

    const savedGoal = localStorage.getItem("kl_relationship_goal");
    if (savedGoal && ["MARRIAGE", "SERIOUS", "FRIENDSHIP", "FUN"].includes(savedGoal)) {
      setRelationshipGoal(savedGoal as "MARRIAGE" | "SERIOUS" | "FRIENDSHIP" | "FUN");
    }
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
      localStorage.setItem("kl_relationship_goal", relationshipGoal);
      setStatus("Profil mis a jour");
    } catch {
      setStatus("Echec de mise a jour du profil. Veuillez reessayer.");
    }
  };

  const handleVideoChange = async (file?: File | null) => {
    if (!file) {
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setSelfieVideoUrl(dataUrl);
      setStatus("Video selfie chargee. Vous pouvez lancer la verification.");
    } catch {
      setStatus("Impossible de lire la video selectionnee.");
    }
  };

  const submitVerification = async () => {
    try {
      setVerificationLoading(true);
      const csrf = await fetchCsrfToken();
      const { data } = await api.post(
        "/profile/verify-identity",
        {
          selfieVideoUrl,
          statement: verificationStatement
        },
        { headers: { "x-csrf-token": csrf } }
      );
      setProfile((prev: any) => ({ ...prev, verifiedBadge: data.verifiedBadge }));
      setStatus("Verification terminee. Votre badge verifie est actif.");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Echec de verification de l'identite.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const uploadProfilePhoto = async (file?: File | null) => {
    if (!file) {
      return;
    }
    try {
      setPhotoUploading(true);
      const csrf = await fetchCsrfToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profiles");
      const { data: upload } = await api.post("/media/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-csrf-token": csrf
        }
      });

      await api.post(
        "/profile/photo",
        {
          mediaUrl: upload.url,
          makePrimary: true
        },
        { headers: { "x-csrf-token": csrf } }
      );

      const refreshed = await api.get("/profile/me");
      setProfile(refreshed.data);
      setStatus("Photo de profil mise a jour.");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Impossible de mettre a jour la photo profil.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const verificationStatus = profile?.verificationStatus ?? (profile?.verifiedBadge ? "verified" : "unverified");

  const addInterest = () => {
    const value = interestInput.trim().toLowerCase();
    if (!value) {
      return;
    }
    setProfile((prev: any) => {
      const interests = Array.isArray(prev?.interests) ? prev.interests : [];
      if (interests.includes(value)) {
        return prev;
      }
      return { ...prev, interests: [...interests, value].slice(0, 10) };
    });
    setInterestInput("");
  };

  const removeInterest = (value: string) => {
    setProfile((prev: any) => ({
      ...prev,
      interests: (prev?.interests ?? []).filter((item: string) => item !== value)
    }));
  };

  return (
    <AuthGuard>
      <section className="space-y-5 animate-fade-in">
        <SectionHeader title="Profil" subtitle="Edition profile + badge verification + reputation" accent="violet" />
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass neon-border rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Edition du profil</p>
                <h3 className="font-heading text-2xl text-white">{profile?.displayName ?? "Utilisateur"}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {profile?.followersCount ?? 0} abonnes • {profile?.followingCount ?? 0} abonnements
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${
                verificationStatus === "verified"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : verificationStatus === "pending"
                    ? "bg-amber-500/15 text-amber-300"
                    : verificationStatus === "rejected"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-white/10 text-slate-300"
              }`}>
                {verificationStatus === "verified"
                  ? "Profil verifie"
                  : verificationStatus === "pending"
                    ? "Verification en attente"
                    : verificationStatus === "rejected"
                      ? "Verification refusee"
                      : "Profil non verifie"}
              </span>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm text-slate-300">Photo de profil</p>
              <div className="mt-2 flex items-center gap-3">
                {profile?.user?.photos?.[0]?.url ? (
                  <img src={profile.user.photos[0].url} alt="Photo profil" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-white/10" />
                )}
                <label className="cursor-pointer rounded-xl border border-white/20 px-3 py-2 text-xs text-slate-200">
                  {photoUploading ? "Upload..." : "Changer photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void uploadProfilePhoto(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>

            <p className="text-sm text-slate-300">Nom</p>
            <input
              aria-label="Nom"
              value={profile?.displayName ?? ""}
              onChange={(e) => setProfile((p: any) => ({ ...p, displayName: e.target.value }))}
              className="input-neon mt-1 w-full rounded-xl px-3 py-2"
            />
            <p className="mt-4 text-sm text-slate-300">Bio</p>
            <textarea
              aria-label="Bio"
              value={profile?.bio ?? ""}
              onChange={(e) => setProfile((p: any) => ({ ...p, bio: e.target.value }))}
              className="input-neon mt-1 min-h-24 w-full rounded-xl px-3 py-2"
            />
            <p className="mt-4 text-sm text-slate-300">Ville</p>
            <input
              aria-label="Ville"
              value={profile?.city ?? ""}
              onChange={(e) => setProfile((p: any) => ({ ...p, city: e.target.value }))}
              className="input-neon mt-1 w-full rounded-xl px-3 py-2"
            />

            <p className="mt-4 text-sm text-slate-300">Objectif relationnel</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "MARRIAGE", label: "Mariage" },
                { key: "SERIOUS", label: "Serieux" },
                { key: "FRIENDSHIP", label: "Amitie" },
                { key: "FUN", label: "Fun" }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRelationshipGoal(item.key as "MARRIAGE" | "SERIOUS" | "FRIENDSHIP" | "FUN")}
                  className={`rounded-xl px-3 py-1.5 text-xs ${relationshipGoal === item.key ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm text-slate-300">Interets</p>
            <div className="mt-2 flex gap-2">
              <input
                  aria-label="Ajouter un interet"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                  className="input-neon w-full rounded-xl px-3 py-2"
                placeholder="Ajouter un interet"
              />
                <button onClick={addInterest} className="btn-outline-neon rounded-xl px-3 text-sm">
                Ajouter
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile?.interests ?? []).map((item: string) => (
                <button key={item} onClick={() => removeInterest(item)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {item} ×
                </button>
              ))}
            </div>
            <button onClick={save} className="btn-neon mt-4 rounded-xl px-4 py-2 font-semibold">
              Enregistrer
            </button>
          </div>

          <div className="glass neon-border-violet rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-neoblue">Verification d'identite</p>
            <h3 className="mt-2 font-heading text-2xl">Selfie video obligatoire</h3>
            <p className="mt-2 text-sm text-slate-300">
              Chargez une courte video selfie et confirmez votre phrase. Cela active le badge verifie pour rassurer les autres utilisateurs.
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="video/*"
                aria-label="Charger une video selfie"
                onChange={(e) => void handleVideoChange(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-dashed border-neoviolet/30 bg-black/20 px-3 py-3 text-sm text-slate-300"
              />
              <textarea
                value={verificationStatement}
                onChange={(e) => setVerificationStatement(e.target.value)}
                className="input-neon min-h-24 w-full rounded-xl px-3 py-2"
                placeholder="Phrase de verification"
              />
              {selfieVideoUrl ? (
                <video src={selfieVideoUrl} controls className="h-48 w-full rounded-2xl border border-white/10 bg-black/40 object-cover" />
              ) : null}
              <button
                onClick={submitVerification}
                disabled={!selfieVideoUrl || verificationLoading || verificationStatus === "pending"}
                className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-[#041127] disabled:opacity-60 transition hover:bg-emerald-300"
              >
                {verificationLoading ? "Verification..." : verificationStatus === "pending" ? "En attente d'approbation admin" : "Verifier mon identite"}
              </button>
              <ul className="space-y-1 text-xs text-slate-400">
                <li>Regardez la camera et restez dans un endroit eclaire.</li>
                <li>La video doit montrer clairement votre visage.</li>
                <li>Evitez les filtres et les lunettes foncees.</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-gold">{status}</p>
      </section>
    </AuthGuard>
  );
}
