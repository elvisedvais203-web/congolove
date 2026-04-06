"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { fetchCsrfToken } from "../../services/security";
import { AuthGuard } from "../../components/AuthGuard";
import { logoutSession } from "../../lib/session";

export default function SettingsPage() {
  const router = useRouter();
  const [dataSaver, setDataSaver] = useState(false);
  const [invisibleMode, setInvisibleMode] = useState(false);
  const [distanceKm, setDistanceKm] = useState(30);
  const [ageMin, setAgeMin] = useState(23);
  const [ageMax, setAgeMax] = useState(36);
  const [relationshipType, setRelationshipType] = useState<"SERIOUS" | "MARRIAGE" | "FRIENDSHIP" | "FUN">("SERIOUS");
  const [language, setLanguage] = useState<"FR" | "SW" | "EN">("FR");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifCalls, setNotifCalls] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState<"VISIBLE" | "HIDDEN">("VISIBLE");
  const [messagePolicy, setMessagePolicy] = useState<"ALL" | "MATCH_ONLY">("MATCH_ONLY");
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get("/profile/me")
      .then((res) => {
        setDataSaver(Boolean(res.data?.user?.dataSaverEnabled));
        setInvisibleMode(Boolean(res.data?.user?.invisibleMode));
      })
      .catch(() => {
        setDataSaver(false);
        setInvisibleMode(false);
      });

    const rawPreferences = localStorage.getItem("kl_user_preferences");
    if (!rawPreferences) {
      return;
    }

    try {
      const parsed = JSON.parse(rawPreferences) as {
        distanceKm?: number;
        ageMin?: number;
        ageMax?: number;
        relationshipType?: "SERIOUS" | "MARRIAGE" | "FRIENDSHIP" | "FUN";
        language?: "FR" | "SW" | "EN";
        theme?: "dark" | "light";
        notifMessages?: boolean;
        notifLikes?: boolean;
        notifCalls?: boolean;
        profileVisibility?: "VISIBLE" | "HIDDEN";
        messagePolicy?: "ALL" | "MATCH_ONLY";
        hideOnlineStatus?: boolean;
      };
      if (typeof parsed.distanceKm === "number") setDistanceKm(parsed.distanceKm);
      if (typeof parsed.ageMin === "number") setAgeMin(parsed.ageMin);
      if (typeof parsed.ageMax === "number") setAgeMax(parsed.ageMax);
      if (parsed.relationshipType) setRelationshipType(parsed.relationshipType);
      if (parsed.language) setLanguage(parsed.language);
      if (parsed.theme) setTheme(parsed.theme);
      if (typeof parsed.notifMessages === "boolean") setNotifMessages(parsed.notifMessages);
      if (typeof parsed.notifLikes === "boolean") setNotifLikes(parsed.notifLikes);
      if (typeof parsed.notifCalls === "boolean") setNotifCalls(parsed.notifCalls);
      if (parsed.profileVisibility) setProfileVisibility(parsed.profileVisibility);
      if (parsed.messagePolicy) setMessagePolicy(parsed.messagePolicy);
      if (typeof parsed.hideOnlineStatus === "boolean") setHideOnlineStatus(parsed.hideOnlineStatus);
    } catch {
      // ignore invalid local state
    }
  }, []);

  const save = async () => {
    try {
      const csrf = await fetchCsrfToken();
      await api.patch(
        "/profile/me",
        {
          dataSaverEnabled: dataSaver,
          invisibleMode
        },
        {
          headers: { "x-csrf-token": csrf }
        }
      );
      localStorage.setItem(
        "kl_user_preferences",
        JSON.stringify({
          distanceKm,
          ageMin,
          ageMax,
          relationshipType,
          language,
          theme,
          notifMessages,
          notifLikes,
          notifCalls,
          profileVisibility,
          messagePolicy,
          hideOnlineStatus
        })
      );
      document.documentElement.setAttribute("data-theme", theme);
      setStatus("Parametres enregistres");
    } catch {
      setStatus("Echec d'enregistrement des parametres. Veuillez reessayer.");
    }
  };

  const logout = () => {
    logoutSession();
    router.replace("/auth");
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Parametres" subtitle="Controle complet: preferences, interface, notifications et confidentialite" />
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="glass rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Preferences</p>
            <div className="mt-3 space-y-4">
              <div>
                <label className="text-sm text-slate-300">Distance maximale: {distanceKm} km</label>
                <input type="range" min={5} max={200} step={5} value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} aria-label="Distance maximale" className="mt-2 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-slate-300">
                  Age min
                  <input type="number" min={18} max={70} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-300">
                  Age max
                  <input type="number" min={18} max={80} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2" />
                </label>
              </div>
              <div>
                <p className="text-sm text-slate-300">Type de relation</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { key: "SERIOUS", label: "Serieux" },
                    { key: "MARRIAGE", label: "Mariage" },
                    { key: "FRIENDSHIP", label: "Amitie" },
                    { key: "FUN", label: "Fun" }
                  ].map((option) => {
                    const active = relationshipType === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => setRelationshipType(option.key as "SERIOUS" | "MARRIAGE" | "FRIENDSHIP" | "FUN")}
                        className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Interface</p>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-sm text-slate-300">Langue</p>
                <div className="mt-2 flex gap-2">
                  {["FR", "SW", "EN"].map((item) => {
                    const active = language === item;
                    return (
                      <button
                        key={item}
                        onClick={() => setLanguage(item as "FR" | "SW" | "EN")}
                        className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300">Theme</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setTheme("dark")} className={`rounded-xl px-3 py-2 text-sm ${theme === "dark" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}>
                    Mode sombre
                  </button>
                  <button onClick={() => setTheme("light")} className={`rounded-xl px-3 py-2 text-sm ${theme === "light" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}>
                    Mode clair
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Notifications</p>
            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>Messages</span>
                <input type="checkbox" checked={notifMessages} onChange={(e) => setNotifMessages(e.target.checked)} className="h-5 w-5" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>Likes</span>
                <input type="checkbox" checked={notifLikes} onChange={(e) => setNotifLikes(e.target.checked)} className="h-5 w-5" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>Appels</span>
                <input type="checkbox" checked={notifCalls} onChange={(e) => setNotifCalls(e.target.checked)} className="h-5 w-5" />
              </label>
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span>Profil visible</span>
              <input
                type="checkbox"
                checked={profileVisibility === "VISIBLE"}
                onChange={(e) => setProfileVisibility(e.target.checked ? "VISIBLE" : "HIDDEN")}
                className="h-5 w-5"
              />
            </label>
            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>Messages de tous</span>
                <input type="checkbox" checked={messagePolicy === "ALL"} onChange={(e) => setMessagePolicy(e.target.checked ? "ALL" : "MATCH_ONLY")} className="h-5 w-5" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>Masquer statut en ligne</span>
                <input type="checkbox" checked={hideOnlineStatus} onChange={(e) => setHideOnlineStatus(e.target.checked)} className="h-5 w-5" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>Activer economie de donnees</span>
                <input type="checkbox" checked={dataSaver} onChange={(e) => setDataSaver(e.target.checked)} className="h-5 w-5" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>Mode invisible</span>
                <input type="checkbox" checked={invisibleMode} onChange={(e) => setInvisibleMode(e.target.checked)} className="h-5 w-5" />
              </label>
            </div>
          </div>

        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={save} className="rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
            Enregistrer
          </button>
          <button onClick={logout} className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-200">
            Se deconnecter
          </button>
          <button onClick={() => setStatus("Demande de suppression recue. Le support vous contactera pour validation finale.")} className="rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-2 text-red-100">
            Supprimer le compte
          </button>
        </div>
        <p className="mt-2 text-sm text-gold">{status}</p>
      </section>
    </AuthGuard>
  );
}
