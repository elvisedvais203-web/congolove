"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/AuthGuard";
import { SectionHeader } from "../../components/SectionHeader";
import { logoutSession } from "../../lib/session";
import {
  DEFAULT_PREFERENCES,
  applyPreferencesToDocument,
  getStoredPreferences,
  saveStoredPreferences,
  type ChatTheme,
  type UserPreferences,
  type VoiceTranscriptMode
} from "../../lib/preferences";
import { fetchCsrfToken } from "../../services/security";
import api from "../../lib/api";
import {
  archiveConversation,
  clearAllConversations,
  deleteAllConversations,
  getChatMessages,
  getConversations
} from "../../services/chat";

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
      setStatus("Age minimum doit etre inferieur ou egal a age maximum.");
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
      setStatus("Parametres enregistres et appliques sur toute l'application.");
    } catch {
      setStatus("Echec d'enregistrement des parametres. Veuillez reessayer.");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setPrefs(DEFAULT_PREFERENCES);
    saveStoredPreferences(DEFAULT_PREFERENCES);
    applyPreferencesToDocument(DEFAULT_PREFERENCES);
    setStatus("Parametres reinitialises.");
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
      a.download = `kongo-love-discussions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Export des discussions termine.");
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
      router.replace("/auth");
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
      { id: "confidentialite" as const, label: "Confidentialite" },
      { id: "media" as const, label: "Media" },
      { id: "notifications" as const, label: "Notifications" }
    ],
    []
  );

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Parametres et activite" subtitle="Toutes les fonctionnalites sont centralisees ici et appliquees en temps reel" />

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-2 text-sm ${active ? "bg-neoblue text-[#08101d]" : "glass text-slate-200"}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === "compte" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Votre compte">
              <div>
                <label className="text-sm text-slate-300">Distance maximale: {prefs.distanceKm} km</label>
                <input type="range" min={5} max={200} step={5} value={prefs.distanceKm} onChange={(event) => setPref("distanceKm", Number(event.target.value))} aria-label="Distance maximale" className="mt-2 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-slate-300">
                  Age min
                  <input type="number" min={18} max={70} value={prefs.ageMin} onChange={(event) => setPref("ageMin", Number(event.target.value))} className="mt-1 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-300">
                  Age max
                  <input type="number" min={18} max={80} value={prefs.ageMax} onChange={(event) => setPref("ageMax", Number(event.target.value))} className="mt-1 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2" />
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
                <p className="text-sm text-slate-300">Theme global</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setPref("theme", "dark")} className={`rounded-xl px-3 py-2 text-sm ${prefs.theme === "dark" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}>Sombre</button>
                  <button onClick={() => setPref("theme", "light")} className={`rounded-xl px-3 py-2 text-sm ${prefs.theme === "light" ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}>Clair</button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300">Theme de discussion</p>
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
          </div>
        )}

        {tab === "discussion" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Conversations">
              <SettingSwitch label="Animations" description="Active les animations de discussion" checked={prefs.chatAnimations} onChange={(value) => setPref("chatAnimations", value)} />
              <SettingSwitch label="Accuses de lecture" description="Afficher le statut Envoye / Lu" checked={prefs.readReceipts} onChange={(value) => setPref("readReceipts", value)} />
              <SettingSwitch label="Sauvegarde auto des photos/medias" description="Active les boutons de telechargement rapide" checked={prefs.autoSaveMedia} onChange={(value) => setPref("autoSaveMedia", value)} />
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
            <SettingCard title="Confidentialite du compte">
              <SettingSwitch label="Profil visible" checked={prefs.profileVisibility === "VISIBLE"} onChange={(value) => setPref("profileVisibility", value ? "VISIBLE" : "HIDDEN")} />
              <SettingSwitch label="Messages de tous" checked={prefs.messagePolicy === "ALL"} onChange={(value) => setPref("messagePolicy", value ? "ALL" : "MATCH_ONLY")} />
              <SettingSwitch label="Masquer statut en ligne" checked={prefs.hideOnlineStatus} onChange={(value) => setPref("hideOnlineStatus", value)} />
              <SettingSwitch label="Mode invisible" checked={prefs.invisibleMode} onChange={(value) => setPref("invisibleMode", value)} />
            </SettingCard>

            <SettingCard title="Securite & acces">
              <SettingSwitch label="Mode economie de donnees" checked={prefs.dataSaver} onChange={(value) => setPref("dataSaver", value)} />
              <button onClick={() => setStatus("Centre de confidentialite pret. Connectez la page backend de policies pour finaliser.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Ouvrir le centre de confidentialite
              </button>
              <button onClick={() => setStatus("Comptes restreints: module pret, activez la route backend pour filtrage avance.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Gerer comptes restreints
              </button>
            </SettingCard>
          </div>
        )}

        {tab === "media" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Contenu multimedia">
              <SettingSwitch label="Qualite HD" description="Desactivez pour optimiser le debit data" checked={!prefs.dataSaver} onChange={(value) => setPref("dataSaver", !value)} />
              <SettingSwitch label="Autoriser camera/galerie" description="Necessaire pour stories, reels et messages media" checked={true} onChange={() => setStatus("Les autorisations se reglent depuis le navigateur ou le telephone.")} />
              <button onClick={() => setStatus("Archivage et telechargements actifs via export JSON et bouton medias dans les chats.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">
                Archivage et telechargements
              </button>
            </SettingCard>

            <SettingCard title="Applications liees">
              <button onClick={() => setStatus("WhatsApp: lien actif via profil et modules social/chat deja integres.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">WhatsApp</button>
              <button onClick={() => setStatus("Instagram: stories/reels/activite deja disponibles dans la navigation.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">Instagram</button>
              <button onClick={() => setStatus("Facebook/Threads/Messenger: hub social pret pour extension crosspostage.")} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white hover:bg-white/10">Facebook / Threads / Messenger</button>
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
          <button onClick={() => void saveAll()} disabled={busy} className="rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127] disabled:opacity-60">
            {busy ? "Traitement..." : "Enregistrer tout"}
          </button>
          <button onClick={resetAll} className="rounded-xl border border-white/20 px-4 py-2 text-slate-200">Reinitialiser</button>
          <button onClick={() => { logoutSession(); router.replace("/auth"); }} className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-200">
            Se deconnecter
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
      </section>
    </AuthGuard>
  );
}
