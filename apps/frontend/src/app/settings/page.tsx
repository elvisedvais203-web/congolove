"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/nextalkauthguard";
import { SectionHeader } from "../../components/nextalksectionheader";
import { logoutSession } from "../../lib/nextalksession";
import {
  DEFAULT_PREFERENCES,
  applyPreferencesToDocument,
  getStoredPreferences,
  saveStoredPreferences,
  type ChatTheme,
  type UserPreferences,
  type VoiceTranscriptMode
} from "../../lib/nextalkpreferences";
import { fetchCsrfToken } from "../../services/nextalksecurity";
import api from "../../lib/nextalkapi";
import {
  archiveConversation,
  clearAllConversations,
  deleteAllConversations,
  getChatMessages,
  getConversations
} from "../../services/nextalkchat";

type SettingsTab = "compte" | "discussion" | "confidentialite" | "media" | "notifications";
type DangerAction = "clear" | "delete" | "account";

function SettingSwitch({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description ? <p className="text-xs text-slate-400">{description}</p> : null}
      </div>
      <input type="checkbox" className="h-5 w-5" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{title}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function DangerConfirmModal({
  action,
  value,
  busy,
  onValueChange,
  onCancel,
  onConfirm
}: {
  action: DangerAction;
  value: string;
  busy: boolean;
  onValueChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [armCountdown, setArmCountdown] = useState(3);

  useEffect(() => {
    setArmCountdown(3);
    const timer = window.setInterval(() => {
      setArmCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [action]);

  const keyword = action === "clear" ? "EFFACER" : "SUPPRIMER";
  const title =
    action === "clear"
      ? "Confirmer effacement global"
      : action === "delete"
        ? "Confirmer suppression globale"
        : "Confirmer suppression du compte";
  const desc =
    action === "clear"
      ? "Cette action efface vos messages et archive vos conversations."
      : action === "delete"
        ? "Cette action retire vos participations et peut supprimer des conversations orphelines."
        : "Cette action est irreversible et supprime vos donnees utilisateur.";
  const canConfirm = value.trim().toUpperCase() === keyword && armCountdown === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg rounded-3xl p-5">
        <h3 className="font-heading text-xl text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{desc}</p>
        <p className="mt-2 text-xs text-slate-400">
          Tapez <span className="font-bold text-gold">{keyword}</span> pour confirmer.
        </p>
        <input
          aria-label="Mot de confirmation"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={keyword}
          className="mt-3 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none"
          autoFocus
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} disabled={busy} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:opacity-60">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || !canConfirm}
            className="rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm text-red-100 disabled:opacity-50"
          >
            {busy ? "Traitement..." : "Confirmer"}
          </button>
        </div>
        {armCountdown > 0 ? (
          <p className="mt-2 text-xs text-amber-300">Confirmation disponible dans {armCountdown}s</p>
        ) : (
          <p className="mt-2 text-xs text-emerald-300">Verification prete</p>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("compte");
  const [prefs, setPrefs] = useState<UserPreferences>(() => getStoredPreferences());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [dangerValue, setDangerValue] = useState("");

  const setPref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let active = true;
    api
      .get("/profile/me")
      .then((res) => {
        if (!active) {
          return;
        }
        const settings = res.data?.user?.settings;
        if (!settings) {
          return;
        }
        setPrefs((prev) => ({
          ...prev,
          language: settings.language ?? prev.language,
          theme: String(settings.theme ?? "DARK").toLowerCase() === "light" ? "light" : "dark",
          chatTheme: String(settings.chatTheme ?? "CLASSIC").toLowerCase() as ChatTheme,
          chatAnimations: Boolean(settings.chatAnimations ?? prev.chatAnimations),
          readReceipts: Boolean(settings.readReceipts ?? prev.readReceipts),
          autoSaveMedia: Boolean(settings.autoSaveMedia ?? prev.autoSaveMedia),
          voiceTranscriptMode: (settings.voiceTranscriptMode ?? prev.voiceTranscriptMode) as VoiceTranscriptMode,
          profileVisibility: settings.profileVisibility ?? prev.profileVisibility,
          messagePolicy: settings.messagePolicy ?? prev.messagePolicy,
          hideOnlineStatus: Boolean(settings.hideOnlineStatus ?? prev.hideOnlineStatus),
          notifMessages: Boolean(settings.notifMessages ?? prev.notifMessages),
          notifLikes: Boolean(settings.notifLikes ?? prev.notifLikes),
          notifCalls: Boolean(settings.notifCalls ?? prev.notifCalls),
          dataSaver: Boolean(res.data?.user?.dataSaverEnabled ?? prev.dataSaver),
          invisibleMode: Boolean(res.data?.user?.invisibleMode ?? prev.invisibleMode)
        }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const saveAll = async () => {
    if (prefs.ageMin > prefs.ageMax) {
      setStatus("L’âge minimum doit être inférieur ou égal à l’âge maximum.");
      return;
    }

    try {
      setBusy(true);
      const csrf = await fetchCsrfToken();
      await api.patch(
        "/profile/me",
        {
          dataSaverEnabled: prefs.dataSaver,
          invisibleMode: prefs.invisibleMode
        },
        {
          headers: { "x-csrf-token": csrf }
        }
      );

      await api.patch(
        "/profile/settings",
        {
          language: prefs.language,
          theme: prefs.theme,
          chatTheme: prefs.chatTheme,
          chatAnimations: prefs.chatAnimations,
          readReceipts: prefs.readReceipts,
          autoSaveMedia: prefs.autoSaveMedia,
          voiceTranscriptMode: prefs.voiceTranscriptMode,
          profileVisibility: prefs.profileVisibility,
          messagePolicy: prefs.messagePolicy,
          hideOnlineStatus: prefs.hideOnlineStatus,
          notifMessages: prefs.notifMessages,
          notifLikes: prefs.notifLikes,
          notifCalls: prefs.notifCalls
        },
        {
          headers: { "x-csrf-token": csrf }
        }
      );

      saveStoredPreferences(prefs);
      applyPreferencesToDocument(prefs);
      setStatus("Paramètres enregistrés et appliqués dans toute l’application.");
    } catch {
      setStatus("Échec d’enregistrement des paramètres. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setPrefs(DEFAULT_PREFERENCES);
    saveStoredPreferences(DEFAULT_PREFERENCES);
    applyPreferencesToDocument(DEFAULT_PREFERENCES);
    setStatus("Paramètres réinitialisés.");
  };

  const exportDiscussions = async () => {
    try {
      setBusy(true);
      const conversations = await getConversations({ archived: false });
      const payload = await Promise.all(
        conversations.slice(0, 30).map(async (conversation) => {
          const data = await getChatMessages(conversation.id, { limit: 100 });
          return {
            conversation: {
              id: conversation.id,
              title: conversation.title,
              kind: conversation.kind,
              archived: conversation.archived
            },
            messages: data.items
          };
        })
      );

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nextalk-discussions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Export des discussions terminé.");
    } catch {
      setStatus("Export impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const archiveEverything = async () => {
    try {
      setBusy(true);
      const csrf = await fetchCsrfToken();
      const conversations = await getConversations({ archived: false });
      await Promise.all(conversations.map((item) => archiveConversation(item.id, true, csrf)));
      setStatus("Toutes les discussions ont ete archivees.");
    } catch {
      setStatus("Impossible d'archiver toutes les discussions.");
    } finally {
      setBusy(false);
    }
  };

  const clearEverything = async () => {
    try {
      setBusy(true);
      const csrf = await fetchCsrfToken();
      const result = await clearAllConversations(csrf);
      setStatus(
        `Discussions effacees: ${result.messagesCleared} messages nettoyes, ${result.archived} conversations archivees.`
      );
    } catch {
      setStatus("Impossible d'effacer toutes les discussions.");
    } finally {
      setBusy(false);
    }
  };

  const deleteEverything = async () => {
    try {
      setBusy(true);
      const csrf = await fetchCsrfToken();
      const result = await deleteAllConversations(csrf);
      setStatus(
        `Discussions supprimees: ${result.membershipsRemoved} participations retirees, ${result.orphanChatsRemoved} chats orphelins supprimes.`
      );
    } catch {
      setStatus("Impossible de supprimer toutes les discussions.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setBusy(true);
      const csrf = await fetchCsrfToken();
      await api.delete("/profile/me", {
        headers: { "x-csrf-token": csrf },
        data: { confirmation: "SUPPRIMER" }
      });
      logoutSession();
      router.replace("/");
    } catch {
      setStatus("Impossible de supprimer le compte pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const openDangerModal = (action: DangerAction) => {
    setDangerAction(action);
    setDangerValue("");
  };

  const closeDangerModal = () => {
    if (busy) {
      return;
    }
    setDangerAction(null);
    setDangerValue("");
  };

  const confirmDangerAction = async () => {
    if (!dangerAction) {
      return;
    }
    if (dangerAction === "clear") {
      await clearEverything();
    } else if (dangerAction === "delete") {
      await deleteEverything();
    } else {
      await deleteAccount();
    }
    setDangerAction(null);
    setDangerValue("");
  };

  const tabs = useMemo(
    () => [
      { id: "compte" as const, label: "Compte" },
      { id: "discussion" as const, label: "Discussions" },
      { id: "confidentialite" as const, label: "Confidentialité" },
      { id: "media" as const, label: "Médias" },
      { id: "notifications" as const, label: "Notifications" }
    ],
    []
  );

  const filteredTabs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter((t) => t.label.toLowerCase().includes(q));
  }, [search, tabs]);

  const updateLocation = async () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("Géolocalisation indisponible sur cet appareil.");
      return;
    }
    try {
      setGeoBusy(true);
      const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 }
        );
      });
      const csrf = await fetchCsrfToken();
      await api.patch(
        "/profile/me",
        { latitude: coords.latitude, longitude: coords.longitude },
        { headers: { "x-csrf-token": csrf } }
      );
      setStatus("Emplacement mis à jour.");
    } catch {
      setStatus("Impossible de récupérer l’emplacement. Vérifiez les permissions.");
    } finally {
      setGeoBusy(false);
    }
  };

  return (
    <AuthGuard>
      <section className="pb-8">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="glass rounded-3xl p-4 lg:sticky lg:top-24 lg:self-start">
            <p className="font-heading text-xl text-white">Paramètres</p>
            <div className="mt-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche"
                className="input-neon w-full rounded-2xl px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 space-y-2">
              {filteredTabs.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                      active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>

          <div>
            <SectionHeader
              title="Paramètres"
            />

            {/* menu onglets remplace par sidebar */}

        {tab === "compte" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Votre compte">
              <div>
                <label className="text-sm text-slate-300">Distance maximale : {prefs.distanceKm} km</label>
                <input type="range" min={5} max={200} step={5} value={prefs.distanceKm} onChange={(event) => setPref("distanceKm", Number(event.target.value))} aria-label="Distance maximale" className="mt-2 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-slate-300">
                  Âge min
                  <input type="number" min={18} max={70} value={prefs.ageMin} onChange={(event) => setPref("ageMin", Number(event.target.value))} className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Âge max
                  <input type="number" min={18} max={80} value={prefs.ageMax} onChange={(event) => setPref("ageMax", Number(event.target.value))} className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white" />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "SERIOUS", label: "Serieux" },
                  { key: "MARRIAGE", label: "Mariage" },
                  { key: "FRIENDSHIP", label: "Amitie" },
                  { key: "FUN", label: "Fun" }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPref("relationshipType", item.key as UserPreferences["relationshipType"])}
                    className={`rounded-xl px-3 py-2 text-sm ${prefs.relationshipType === item.key ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </SettingCard>

            <SettingCard title="Langue et apparence">
              <div>
                <p className="text-sm text-slate-300">Langue</p>
                <div className="mt-2 flex gap-2">
                  {(["FR", "SW", "EN"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setPref("language", lang)}
                      className={`rounded-xl px-3 py-2 text-sm ${prefs.language === lang ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300">Thème global</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setPref("theme", "dark")} className={`rounded-xl px-3 py-2 text-sm ${prefs.theme === "dark" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}>Sombre</button>
                  <button onClick={() => setPref("theme", "light")} className={`rounded-xl px-3 py-2 text-sm ${prefs.theme === "light" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}>Clair</button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300">Thème de discussion</p>
                <div className="mt-2 flex gap-2">
                  {[
                    { key: "classic", label: "Classique" },
                    { key: "aqua", label: "Aqua" },
                    { key: "sunset", label: "Sunset" }
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setPref("chatTheme", item.key as ChatTheme)}
                      className={`rounded-xl px-3 py-2 text-sm ${prefs.chatTheme === item.key ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </SettingCard>

            <SettingCard title="Emplacement">
              <button
                onClick={() => void updateLocation()}
                disabled={geoBusy}
                className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm disabled:opacity-60"
              >
                {geoBusy ? "Mise à jour..." : "Mettre à jour l’emplacement"}
              </button>
            </SettingCard>

            <SettingCard title="Infos & liens utiles">
              <div className="grid gap-2">
                <Link href="/channels" className="btn-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                  Créer un nouveau canal
                </Link>
                <Link href="/about" className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                  À propos
                </Link>
                <Link href="/help" className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                  Aide
                </Link>
                <Link href="/safety" className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                  Sécurité
                </Link>
                <Link href="/contact" className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                  Contact
                </Link>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href="/legal/terms" className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                    Conditions
                  </Link>
                  <Link href="/legal/privacy" className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                    Confidentialité
                  </Link>
                  <Link href="/legal/cookies" className="btn-outline-neon w-full rounded-xl px-4 py-2 text-left text-sm">
                    Cookies
                  </Link>
                </div>
              </div>
            </SettingCard>
          </div>
        )}

        {tab === "discussion" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Conversations">
              <SettingSwitch label="Animations" description="Transitions et animations dans les discussions" checked={prefs.chatAnimations} onChange={(value) => setPref("chatAnimations", value)} />
              <SettingSwitch label="Accusés de lecture" description="Afficher l’état Envoyé / Lu" checked={prefs.readReceipts} onChange={(value) => setPref("readReceipts", value)} />
              <SettingSwitch label="Téléchargement rapide des médias" description="Afficher les actions de téléchargement sur les médias" checked={prefs.autoSaveMedia} onChange={(value) => setPref("autoSaveMedia", value)} />
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm text-white">Transcrire les messages vocaux</p>
                <div className="mt-2 flex gap-2">
                  {[
                    { key: "NEVER", label: "Jamais" },
                    { key: "MANUAL", label: "Manuellement" }
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setPref("voiceTranscriptMode", item.key as VoiceTranscriptMode)}
                      className={`rounded-xl px-3 py-2 text-sm ${prefs.voiceTranscriptMode === item.key ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </SettingCard>

            <SettingCard title="Actions discussions">
              <button onClick={() => void archiveEverything()} disabled={busy} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-60">
                Archiver toutes les discussions
              </button>
              <button onClick={() => openDangerModal("clear")} disabled={busy} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-60">
                Effacer toutes les discussions
              </button>
              <button onClick={() => openDangerModal("delete")} disabled={busy} className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-left text-sm text-red-100 hover:bg-red-500/20 disabled:opacity-60">
                Supprimer toutes les discussions
              </button>
              <button onClick={() => void exportDiscussions()} disabled={busy} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-60">
                Exporter les discussions
              </button>
            </SettingCard>
          </div>
        )}

        {tab === "confidentialite" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Confidentialité du compte">
              <SettingSwitch label="Profil visible" checked={prefs.profileVisibility === "VISIBLE"} onChange={(value) => setPref("profileVisibility", value ? "VISIBLE" : "HIDDEN")} />
              <SettingSwitch label="Messages de tous" checked={prefs.messagePolicy === "ALL"} onChange={(value) => setPref("messagePolicy", value ? "ALL" : "MATCH_ONLY")} />
              <SettingSwitch label="Masquer le statut en ligne" checked={prefs.hideOnlineStatus} onChange={(value) => setPref("hideOnlineStatus", value)} />
              <SettingSwitch label="Mode invisible" checked={prefs.invisibleMode} onChange={(value) => setPref("invisibleMode", value)} />
            </SettingCard>

            <SettingCard title="Sécurité">
              <SettingSwitch label="Mode économie de données" checked={prefs.dataSaver} onChange={(value) => setPref("dataSaver", value)} />
              <button onClick={() => setStatus("Centre de confidentialite pret. Connectez la route backend correspondante pour finaliser.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Ouvrir le centre de confidentialité
              </button>
              <button onClick={() => setStatus("Comptes restreints: module pret, activez la route backend pour filtrage avance.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Gérer les comptes restreints
              </button>
            </SettingCard>
          </div>
        )}

        {tab === "media" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Contenu multimédia">
              <SettingSwitch label="Qualité HD" description="Désactivez pour réduire l’utilisation de données" checked={!prefs.dataSaver} onChange={(value) => setPref("dataSaver", !value)} />
              <SettingSwitch label="Autoriser camera/galerie" description="Necessaire pour stories, reels et messages media" checked={true} onChange={() => setStatus("Les autorisations se reglent depuis le navigateur ou le telephone.")} />
              <button onClick={() => setStatus("Archivage et telechargements actifs via export JSON et bouton medias dans les chats.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Archivage et telechargements
              </button>
            </SettingCard>

            <SettingCard title="Intégrations">
              <button onClick={() => setStatus("Intégrations externes : module prêt. Activez les connecteurs si nécessaire.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Connecteurs externes
              </button>
              <button onClick={() => setStatus("Partage : configuration prête. Ajoutez vos destinations de publication.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Partage et publication
              </button>
            </SettingCard>
          </div>
        )}

        {tab === "notifications" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Notifications push">
              <SettingSwitch label="Messages" checked={prefs.notifMessages} onChange={(value) => setPref("notifMessages", value)} />
              <SettingSwitch label="Likes" checked={prefs.notifLikes} onChange={(value) => setPref("notifLikes", value)} />
              <SettingSwitch label="Appels" checked={prefs.notifCalls} onChange={(value) => setPref("notifCalls", value)} />
            </SettingCard>

            <SettingCard title="Commandes rapides">
              <button onClick={() => setStatus("Notification test envoyee (simulation front).")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Envoyer une notification test
              </button>
              <button onClick={() => setStatus("Paiements et commandes relies au module wallet/freemium deja en place.")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Commandes et paiements
              </button>
            </SettingCard>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => void saveAll()} disabled={busy} className="rounded-xl bg-[#38d37f] px-4 py-2 font-semibold text-[#041127] transition-colors hover:bg-[#4be191] disabled:opacity-60">
            {busy ? "Traitement..." : "Enregistrer tout"}
          </button>
          <button onClick={resetAll} className="rounded-xl border border-white/20 px-4 py-2 text-slate-200">Réinitialiser</button>
          <button onClick={() => { logoutSession(); router.replace("/"); }} className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-200">
            Se déconnecter
          </button>
          <button onClick={() => openDangerModal("account")} className="rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-2 text-red-100">
            Supprimer le compte
          </button>
        </div>
        <p className="mt-3 text-sm text-gold">{status}</p>

        {dangerAction ? (
          <DangerConfirmModal
            action={dangerAction}
            value={dangerValue}
            busy={busy}
            onValueChange={setDangerValue}
            onCancel={closeDangerModal}
            onConfirm={() => void confirmDangerAction()}
          />
        ) : null}
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}
