"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/nextalkauthguard";
import { SectionHeader } from "../../components/nextalksectionheader";
import api from "../../lib/nextalkapi";
import { fetchCsrfToken } from "../../services/nextalksecurity";
import {
  broadcastToChannel,
  createChannel,
  getConversations,
  subscribeToChannel,
  type ChatMessageType,
  type Conversation
} from "../../services/nextalkchat";

function guessType(file: File): ChatMessageType {
  const t = String(file.type || "").toLowerCase();
  if (t.startsWith("image/")) return "IMAGE";
  if (t.startsWith("video/")) return "VIDEO";
  if (t.startsWith("audio/")) return "VOICE";
  return "TEXT";
}

export default function ChannelsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Conversation[]>([]);
  const [status, setStatus] = useState("");

  const [channelTitle, setChannelTitle] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [channelMessage, setChannelMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  const filtered = useMemo(() => channels.filter((c) => c.kind === "GROUP"), [channels]);

  const refresh = async (query?: string) => {
    try {
      setLoading(true);
      const rows = await getConversations({ q: (query ?? "").trim(), archived: false });
      setChannels(rows ?? []);
      if (!selectedChannelId) {
        const firstGroup = (rows ?? []).find((c) => c.kind === "GROUP");
        if (firstGroup) setSelectedChannelId(firstGroup.id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = q.trim();
    const timer = setTimeout(() => void refresh(query), 220);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const createChannelNow = async () => {
    if (!channelTitle.trim() || creating) return;
    try {
      setCreating(true);
      setStatus("");
      const csrf = await fetchCsrfToken();
      const created = await createChannel(
        {
          title: channelTitle.trim(),
          description: channelDescription.trim() || undefined,
          isPublic: true
        },
        csrf
      );
      await subscribeToChannel(created.id, csrf);
      setChannelTitle("");
      setChannelDescription("");
      setSelectedChannelId(created.id);
      setStatus("Canal créé avec succès.");
      await refresh(q);
      router.push(`/messages/${created.id}`);
    } catch {
      setStatus("Création du canal impossible pour le moment.");
    } finally {
      setCreating(false);
    }
  };

  const subscribeNow = async (channelId: string) => {
    try {
      setStatus("");
      const csrf = await fetchCsrfToken();
      await subscribeToChannel(channelId, csrf);
      setStatus("Abonnement au canal effectué.");
      await refresh(q);
    } catch {
      setStatus("Échec abonnement canal.");
    }
  };

  const uploadOne = async (file: File, csrf: string): Promise<{ url: string; fileName: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "channels");
    const { data: upload } = await api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf },
      onUploadProgress: (evt) => {
        const total = evt.total ?? 0;
        if (total > 0) {
          setPublishProgress(Math.round((evt.loaded / total) * 100));
        }
      }
    });
    const url = String(upload?.url ?? upload?.secure_url ?? upload?.mediaUrl ?? "");
    if (!url) {
      throw new Error("upload_failed");
    }
    return { url, fileName: file.name };
  };

  const publishNow = async () => {
    if (!selectedChannelId || publishing) return;
    if (!channelMessage.trim() && files.length === 0) return;

    try {
      setPublishing(true);
      setStatus("");
      setPublishProgress(0);
      const csrf = await fetchCsrfToken();

      // 1) Envoyer le texte si présent
      const text = channelMessage.trim();
      if (text) {
        await broadcastToChannel(selectedChannelId, { text, type: "TEXT" }, csrf);
      }

      // 2) Uploader et diffuser les fichiers (1 msg par fichier)
      for (const file of files) {
        setPublishProgress(0);
        const uploaded = await uploadOne(file, csrf);
        const inferred = guessType(file);

        // Pour les fichiers non supportés par le type (PDF/Word/Excel...), on envoie un message TEXT avec mediaUrl + fileName.
        const payload =
          inferred === "TEXT"
            ? { type: "TEXT" as const, text: `📎 ${uploaded.fileName}`, mediaUrl: uploaded.url, fileName: uploaded.fileName }
            : { type: inferred, text: undefined, mediaUrl: uploaded.url, fileName: uploaded.fileName };

        await broadcastToChannel(selectedChannelId, payload as any, csrf);
      }

      setChannelMessage("");
      setFiles([]);
      setPublishProgress(0);
      setStatus("Publication envoyée dans le canal.");
    } catch {
      setStatus("Diffusion canal indisponible.");
    } finally {
      setPublishing(false);
      setPublishProgress(0);
    }
  };

  return (
    <AuthGuard>
      <section className="pb-20 animate-fade-in">
        <SectionHeader title="Canaux" accent="violet" />

        <div className="glass rounded-3xl p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Rechercher un canal</p>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tape le préfixe du nom du canal..."
                className="input-neon mt-2 w-full rounded-2xl px-3 py-2 text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">Si aucun canal ne correspond, tu verras “messager introuvable”.</p>
            </div>
            <Link href="/settings" className="wa-pill w-fit px-3 py-2 text-xs">
              Paramètres
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? <p className="text-sm text-slate-300">Chargement...</p> : null}
            {!loading && filtered.length === 0 ? (
              <p className="text-sm text-slate-400">Messager introuvable.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.slice(0, 12).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                    <button onClick={() => setSelectedChannelId(c.id)} className="min-w-0 text-left" type="button">
                      <p className="truncate text-sm font-semibold text-white">{c.title}</p>
                      <p className="truncate text-xs text-slate-400">{c.memberCount} membres</p>
                    </button>
                    <button onClick={() => void subscribeNow(c.id)} className="wa-pill px-2.5 py-1 text-xs" type="button">
                      Suivre
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {status ? <div className="mt-4 glass rounded-2xl p-3 text-sm text-gold">{status}</div> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8ef0b9]">Canaux / chaînes</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Créer un canal</h3>
            <input
              value={channelTitle}
              onChange={(event) => setChannelTitle(event.target.value)}
              placeholder="Nom du canal"
              className="input-neon mt-3 w-full rounded-xl px-3 py-2 text-sm"
              disabled={creating}
            />
            <textarea
              value={channelDescription}
              onChange={(event) => setChannelDescription(event.target.value)}
              placeholder="Description"
              rows={3}
              className="input-neon mt-2 w-full rounded-xl px-3 py-2 text-sm"
              disabled={creating}
            />
            <button onClick={() => void createChannelNow()} disabled={creating} className="btn-neon mt-3 rounded-xl px-4 py-2 text-sm disabled:opacity-60" type="button">
              {creating ? "Création..." : "Créer le canal"}
            </button>
          </div>

          <div className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8ef0b9]">Diffusion canal</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Publier dans un canal</h3>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Canal sélectionné</p>
              <p className="mt-1 text-sm text-white">{selectedChannelId ? selectedChannelId : "Aucun"}</p>
            </div>

            <textarea
              value={channelMessage}
              onChange={(event) => setChannelMessage(event.target.value)}
              placeholder="Message à diffuser dans le canal"
              rows={3}
              className="input-neon mt-3 w-full rounded-xl px-3 py-2 text-sm"
              disabled={publishing}
            />

            <div className="mt-3 flex flex-col gap-2">
              <label className="btn-outline-neon cursor-pointer rounded-xl px-4 py-2 text-sm">
                Joindre des fichiers (photo/vidéo/PDF/Word/Excel…)
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const list = Array.from(e.target.files ?? []);
                    setFiles(list.slice(0, 6));
                    e.target.value = "";
                  }}
                  disabled={publishing}
                />
              </label>
              {files.length ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">Fichiers</p>
                  <ul className="space-y-1">
                    {files.map((f) => (
                      <li key={`${f.name}-${f.size}`}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {publishing && publishProgress > 0 ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-neoblue transition-all" style={{ width: `${publishProgress}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-300">Upload: {publishProgress}%</p>
              </div>
            ) : null}

            <button onClick={() => void publishNow()} disabled={publishing || !selectedChannelId} className="btn-neon mt-3 w-full rounded-xl px-4 py-2 text-sm disabled:opacity-60" type="button">
              {publishing ? "Publication..." : "Publier"}
            </button>
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}

