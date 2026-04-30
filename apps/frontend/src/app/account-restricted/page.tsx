"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../../lib/nextalkapi";

type RestrictionState = {
  type: "SUSPENDED" | "BANNED";
  reason: string;
  until: string | null;
  ts: string;
};

export default function AccountRestrictedPage() {
  const [data, setData] = useState<RestrictionState | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("kl_account_restriction");
    if (!raw) {
      return;
    }
    try {
      setData(JSON.parse(raw) as RestrictionState);
    } catch {
      setData(null);
    }
  }, []);

  const typeLabel = data?.type === "BANNED" ? "Compte banni" : "Compte suspendu";

  const submitAppeal = async () => {
    const trimmedIdentifier = identifier.trim();
    const trimmedMessage = message.trim();

    if (trimmedIdentifier.length < 4) {
      setStatus("Saisis ton email ou ton telephone.");
      return;
    }
    if (trimmedMessage.length < 20) {
      setStatus("Explique ta demande en 20 caracteres minimum.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    try {
      await api.post("/moderation/appeal", {
        identifier: trimmedIdentifier,
        message: trimmedMessage
      });
      setStatus("Recours envoye. L'equipe moderation va examiner ton dossier.");
      setMessage("");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Impossible d'envoyer le recours.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto mt-8 max-w-2xl">
      <article className="glass rounded-3xl border border-red-400/30 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-red-300">Securite compte</p>
        <h1 className="mt-2 font-heading text-3xl text-white">{typeLabel}</h1>
        <p className="mt-3 text-sm text-slate-200">
          L'acces a ce compte a ete restreint pour proteger la communaute et prevenir les abus.
        </p>

        <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-300">
            <span className="text-slate-400">Motif :</span> {data?.reason ?? "Restriction admin active"}
          </p>
          {data?.until ? (
            <p className="text-sm text-slate-300">
              <span className="text-slate-400">Fin de suspension :</span> {new Date(data.until).toLocaleString("fr-FR")}
            </p>
          ) : (
            <p className="text-sm text-slate-300">
              <span className="text-slate-400">Statut :</span> Sans date de fin automatique
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/auth" className="rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
            Retour connexion
          </Link>
          <Link href="/contact" className="rounded-xl border border-white/20 px-4 py-2 text-slate-200 hover:text-white">
            Contacter le support
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="font-heading text-xl text-white">Demande de recours</h2>
          <p className="mt-2 text-sm text-slate-300">Saisis ton email ou telephone du compte, puis explique pourquoi la restriction doit etre reetudiee.</p>

          <div className="mt-4 grid gap-3">
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-neoblue"
              placeholder="Email ou telephone"
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-neoblue"
              placeholder="Explique ta situation, ce que tu contestes et les faits utiles"
            />
            <button
              onClick={submitAppeal}
              disabled={submitting}
              className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-[#041127] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Envoi..." : "Envoyer le recours"}
            </button>
          </div>

          {status ? <p className="mt-3 text-sm text-gold">{status}</p> : null}
        </div>
      </article>
    </section>
  );
}
