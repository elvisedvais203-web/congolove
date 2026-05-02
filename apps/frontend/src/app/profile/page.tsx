"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../../components/nextalksectionheader";
import api from "../../lib/nextalkapi";
import { AuthGuard } from "../../components/nextalkauthguard";
import { fetchCsrfToken } from "../../services/nextalksecurity";
import { getFeed, getSavedFeed } from "../../services/nextalksocial";
import { getStoredUser } from "../../lib/nextalksession";
import { SololaThemedLogo } from "../../components/sololathemedlogo";

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
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState<"posts" | "reels" | "saved" | "tagged">("posts");
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [reelVisible, setReelVisible] = useState(true);
  const me = typeof window !== "undefined" ? getStoredUser() : null;

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

  useEffect(() => {
    if (!me?.id) return;
    Promise.all([getFeed(40), getSavedFeed(40)])
      .then(([feedRows, savedRows]) => {
        const mine = (feedRows ?? []).filter((r: any) => r?.author?.id === me.id);
        setMyPosts(mine);
        setSavedPosts(savedRows ?? []);
      })
      .catch(() => {
        setMyPosts([]);
        setSavedPosts([]);
      });
  }, [me?.id]);

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
      setStatus("Profil mis a jour.");
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
  const reels = useMemo(
    () => myPosts.filter((post: any) => String(post?.mediaUrl ?? "").match(/\.(mp4|webm|mov)($|\?)/i)),
    [myPosts]
  );
  const gallery = useMemo(() => {
    const fromPosts = (myPosts ?? []).filter((p) => p?.mediaUrl).map((p) => p.mediaUrl);
    const fromPhotos = (profile?.user?.photos ?? []).map((p: any) => p.url);
    return [...fromPosts, ...fromPhotos].filter(Boolean);
  }, [myPosts, profile?.user?.photos]);

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

  const triggerHaptic = (ms = 12) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  };

  const moveReel = (direction: "up" | "down") => {
    setActiveReelIndex((prev) => {
      if (prev === null) return null;
      const nextIndex = direction === "down" ? Math.min(reels.length - 1, prev + 1) : Math.max(0, prev - 1);
      if (nextIndex !== prev) {
        triggerHaptic(10);
        setReelVisible(false);
        setTimeout(() => setReelVisible(true), 70);
      }
      return nextIndex;
    });
  };

  useEffect(() => {
    if (activeReelIndex === null) return;

    let startY = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveReelIndex(null);
      if (e.key === "ArrowDown") moveReel("down");
      if (e.key === "ArrowUp") moveReel("up");
    };
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0]?.clientY ?? 0;
      const delta = endY - startY;
      if (Math.abs(delta) < 45) return;
      if (delta < 0) moveReel("down");
      if (delta > 0) moveReel("up");
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [activeReelIndex, reels.length]);

  useEffect(() => {
    if (activeReelIndex === null) return;
    const nextUrls = [reels[activeReelIndex + 1]?.mediaUrl, reels[activeReelIndex + 2]?.mediaUrl].filter(Boolean);
    nextUrls.forEach((url) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = String(url);
    });
  }, [activeReelIndex, reels]);

  return (
    <AuthGuard>
      <section className="animate-fade-in pb-8">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="glass rounded-3xl p-4 lg:sticky lg:top-24 lg:self-start">
            <p className="font-heading text-xl text-white">Profil</p>
            <div className="mt-4 space-y-2">
              <a href="#edit" className="block rounded-2xl bg-white/10 px-4 py-3 text-sm text-white">Modifier le profil</a>
              <a href="#security" className="block rounded-2xl px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Sécurité</a>
              <a href="#verification" className="block rounded-2xl px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Vérification</a>
            </div>
          </aside>

          <div className="space-y-5">
            <SectionHeader title="Modifier le profil" accent="violet" />
            <div className="glass rounded-3xl p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  {profile?.user?.photos?.[0]?.url ? (
                    <img src={profile.user.photos[0].url} alt="Avatar" className="h-20 w-20 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10">
                      <SololaThemedLogo width={52} height={52} className="rounded-full opacity-90" />
                    </div>
                  )}
                  <div>
                    <p className="font-heading text-2xl text-white">{profile?.displayName ?? "Utilisateur"}</p>
                    <p className="text-sm text-slate-400">@{(profile?.displayName ?? "utilisateur").toLowerCase().replace(/\s+/g, "")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-white/5 px-3 py-2">
                    <p className="text-lg font-semibold text-white">{gallery.length}</p>
                    <p className="text-xs text-slate-400">Posts</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2">
                    <p className="text-lg font-semibold text-white">{profile?.followersCount ?? 0}</p>
                    <p className="text-xs text-slate-400">Abonnés</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2">
                    <p className="text-lg font-semibold text-white">{profile?.followingCount ?? 0}</p>
                    <p className="text-xs text-slate-400">Abonnements</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setProfileTab("posts")} className={`wa-pill px-3 py-1.5 text-xs ${profileTab === "posts" ? "wa-pill-active" : ""}`}>Publications</button>
                <button onClick={() => setProfileTab("reels")} className={`wa-pill px-3 py-1.5 text-xs ${profileTab === "reels" ? "wa-pill-active" : ""}`}>Reels</button>
                <button onClick={() => setProfileTab("saved")} className={`wa-pill px-3 py-1.5 text-xs ${profileTab === "saved" ? "wa-pill-active" : ""}`}>Enregistrés</button>
                <button onClick={() => setProfileTab("tagged")} className={`wa-pill px-3 py-1.5 text-xs ${profileTab === "tagged" ? "wa-pill-active" : ""}`}>Identifié</button>
              </div>
              {profileTab === "posts" && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {gallery.slice(0, 18).map((url: string, i: number) => (
                    <div key={`${url}-${i}`} className="aspect-square overflow-hidden rounded-xl bg-white/5">
                      <img src={url} alt={`post-${i}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                  {gallery.length === 0 && (
                    <div className="col-span-3 rounded-xl bg-white/5 p-4 text-center text-sm text-slate-400">Aucune publication média.</div>
                  )}
                </div>
              )}
              {profileTab === "saved" && (
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {savedPosts.slice(0, 18).map((post: any, i: number) => (
                    <div key={post.id ?? i} className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">
                      {post.mediaUrl ? (
                        <img src={post.mediaUrl} alt={`saved-${i}`} className="aspect-square w-full rounded-lg object-cover" />
                      ) : (
                        <p className="line-clamp-4 text-xs text-slate-300">{post.content ?? "Post enregistré"}</p>
                      )}
                    </div>
                  ))}
                  {savedPosts.length === 0 && (
                    <div className="col-span-3 rounded-xl bg-white/5 p-4 text-center text-sm text-slate-400">Aucun post enregistré.</div>
                  )}
                </div>
              )}
              {profileTab === "reels" && (
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {reels.slice(0, 15).map((post: any, i: number) => (
                    <button
                      key={post.id ?? i}
                      onClick={() => {
                        triggerHaptic(8);
                        setActiveReelIndex(i);
                        setReelVisible(true);
                      }}
                      className="w-full text-left"
                    >
                      <video src={post.mediaUrl} className="aspect-[9/16] w-full rounded-xl border border-white/10 bg-black/40 object-cover transition hover:scale-[1.01]" muted />
                    </button>
                  ))}
                  {reels.length === 0 && (
                    <div className="col-span-3 rounded-xl bg-white/5 p-4 text-center text-sm text-slate-400">Aucun reel vidéo pour le moment.</div>
                  )}
                </div>
              )}
              {profileTab === "tagged" && (
                <div className="mt-4 rounded-xl bg-white/5 p-4 text-center text-sm text-slate-400">
                  Section prête (identifications).
                </div>
              )}
            </div>
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                    <SololaThemedLogo width={34} height={34} className="rounded-full opacity-90" />
                  </div>
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
          </div>
        </div>
      </section>
      {activeReelIndex !== null && reels[activeReelIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3">
          <button onClick={() => setActiveReelIndex(null)} className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-sm text-white">
            Fermer
          </button>
          <button
            onClick={() => moveReel("up")}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-white disabled:opacity-40"
            disabled={activeReelIndex === 0}
          >
            ↑
          </button>
          <div className="w-full max-w-[440px]">
            <video
              key={reels[activeReelIndex].id}
              src={reels[activeReelIndex].mediaUrl}
              controls
              autoPlay
              className={`aspect-[9/16] w-full rounded-2xl border border-white/10 bg-black object-cover transition-opacity duration-200 ${reelVisible ? "opacity-100" : "opacity-40"}`}
            />
            <p className="mt-2 text-center text-xs text-slate-300">Swipe haut/bas ou flèches clavier</p>
          </div>
          <button
            onClick={() => moveReel("down")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-white disabled:opacity-40"
            disabled={activeReelIndex >= reels.length - 1}
          >
            ↓
          </button>
        </div>
      ) : null}
    </AuthGuard>
  );
}
