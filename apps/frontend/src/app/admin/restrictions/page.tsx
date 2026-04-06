"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { SectionHeader } from "../../../components/SectionHeader";
import api from "../../../lib/api";

type RestrictionRow = {
  id: string;
  userId: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
  status: "ACTIVE" | "LIFTED";
  type: "SUSPENDED" | "BANNED" | null;
  reason: string | null;
  note: string | null;
  until: string | null;
  reviewedBy: string | null;
  createdAt: string;
};

type AppealRow = {
  id: string;
  logId: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  identifier: string | null;
  message: string;
  status: "OPEN" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedBy: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  riskScore: number;
  riskReasons: string[];
};

export default function AdminRestrictionsPage() {
  const [rows, setRows] = useState<RestrictionRow[]>([]);
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [status, setStatus] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [openAppealsOnly, setOpenAppealsOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [appealsPage, setAppealsPage] = useState(1);
  const [busyAppealId, setBusyAppealId] = useState<string | null>(null);
  const appealsPageSize = 8;

  useEffect(() => {
    Promise.all([api.get<RestrictionRow[]>("/moderation/admin/restrictions"), api.get<AppealRow[]>("/moderation/admin/appeals")])
      .then(([restrictionsRes, appealsRes]) => {
        setRows(restrictionsRes.data);
        setAppeals(appealsRes.data);
      })
      .catch(() => setStatus("Impossible de charger les restrictions/recours."));
  }, []);

  const visibleRows = activeOnly ? rows.filter((row) => row.status === "ACTIVE") : rows;

  const exportCsv = () => {
    const headers = ["date", "displayName", "email", "phone", "type", "status", "reason", "note", "until", "reviewedBy"];
    const csvRows = visibleRows.map((row) => [
      new Date(row.createdAt).toISOString(),
      row.displayName,
      row.email ?? "",
      row.phone ?? "",
      row.type ?? "",
      row.status,
      row.reason ?? "",
      row.note ?? "",
      row.until ?? "",
      row.reviewedBy ?? ""
    ]);

    const escapeCsv = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const content = [headers.map(escapeCsv).join(","), ...csvRows.map((cols) => cols.map((col) => escapeCsv(String(col))).join(","))].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `restrictions-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reviewAppeal = async (appealId: string, decision: "APPROVED" | "REJECTED") => {
    const note = window.prompt(decision === "APPROVED" ? "Note interne (optionnelle):" : "Motif du rejet (recommande):") ?? "";
    try {
      setBusyAppealId(appealId);
      await api.post(`/moderation/admin/appeals/${appealId}/resolve`, { decision, note });
      const appealsRes = await api.get<AppealRow[]>("/moderation/admin/appeals");
      const restrictionsRes = await api.get<RestrictionRow[]>("/moderation/admin/restrictions");
      setAppeals(appealsRes.data);
      setRows(restrictionsRes.data);
      setAppealsPage(1);
      setStatus(decision === "APPROVED" ? "Recours accepte et restriction levee." : "Recours rejete.");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Impossible de traiter ce recours.");
    } finally {
      setBusyAppealId(null);
    }
  };

  const openAppeals = appeals.filter((appeal) => appeal.status === "OPEN");
  const baseAppeals = openAppealsOnly ? openAppeals : appeals;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAppeals = normalizedQuery
    ? baseAppeals.filter((appeal) => {
        const haystack = [
          appeal.displayName,
          appeal.email,
          appeal.phone,
          appeal.identifier,
          appeal.message,
          appeal.status,
          ...(appeal.riskReasons ?? [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : baseAppeals;

  const sortedAppeals = [...filteredAppeals].sort((a, b) => {
    const openWeightA = a.status === "OPEN" ? 1 : 0;
    const openWeightB = b.status === "OPEN" ? 1 : 0;
    if (openWeightA !== openWeightB) {
      return openWeightB - openWeightA;
    }
    if (a.riskScore !== b.riskScore) {
      return b.riskScore - a.riskScore;
    }
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  const appealsTotalPages = Math.max(1, Math.ceil(sortedAppeals.length / appealsPageSize));
  const safeAppealsPage = Math.min(appealsPage, appealsTotalPages);
  const pagedAppeals = sortedAppeals.slice((safeAppealsPage - 1) * appealsPageSize, safeAppealsPage * appealsPageSize);

  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin restrictions" subtitle="Historique complet des suspensions, bannissements et levees" />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveOnly((value) => !value)}
            className={`rounded-xl px-3 py-2 text-sm ${activeOnly ? "bg-neoblue/25 text-neoblue" : "bg-white/10 text-slate-300"}`}
          >
            {activeOnly ? "Actifs seulement: ON" : "Actifs seulement: OFF"}
          </button>
          <button onClick={exportCsv} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#041127]">
            Export CSV
          </button>
          <span className="text-xs text-slate-400">{visibleRows.length} ligne(s)</span>
        </div>
        <div className="glass overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[1.3fr_0.9fr_0.9fr_1.2fr] gap-3 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Utilisateur</span>
            <span>Type</span>
            <span>Statut</span>
            <span>Details</span>
          </div>
          <div className="divide-y divide-white/5">
            {visibleRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.3fr_0.9fr_0.9fr_1.2fr] gap-3 px-4 py-4 text-sm text-slate-200">
                <div>
                  <p className="font-semibold text-white">{row.displayName}</p>
                  <p className="text-xs text-slate-400">{row.email || row.phone || "-"}</p>
                  <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <span className={`rounded-full px-2 py-1 text-xs ${row.type === "BANNED" ? "bg-red-700/30 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                    {row.type ?? "-"}
                  </span>
                </div>
                <div>
                  <span className={`rounded-full px-2 py-1 text-xs ${row.status === "ACTIVE" ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                    {row.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-300">{row.reason || "-"}</p>
                  {row.until ? <p className="mt-1 text-xs text-amber-300">Fin: {new Date(row.until).toLocaleString("fr-FR")}</p> : null}
                  {row.note ? <p className="mt-1 text-xs text-slate-400">Note: {row.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 glass overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Recours utilisateurs</p>
                <p className="text-sm text-slate-300">{openAppeals.length} recours en attente • Tri: risque eleve d'abord</p>
              </div>
              <button
                onClick={() => {
                  setOpenAppealsOnly((value) => !value);
                  setAppealsPage(1);
                }}
                className={`rounded-xl px-3 py-1 text-xs ${openAppealsOnly ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-300"}`}
              >
                {openAppealsOnly ? "Ouverts seulement: ON" : "Ouverts seulement: OFF"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setAppealsPage(1);
                }}
                placeholder="Rechercher: nom, email, telephone, motif, risque..."
                className="w-full max-w-md rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-neoblue"
              />
              <span className="text-xs text-slate-400">{sortedAppeals.length} resultat(s)</span>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {pagedAppeals.map((appeal) => (
              <div key={appeal.id} className="px-4 py-4 text-sm text-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{appeal.displayName}</p>
                    <p className="text-xs text-slate-400">{appeal.email || appeal.phone || appeal.identifier || "-"}</p>
                    <p className="text-xs text-slate-500">Soumis: {new Date(appeal.submittedAt).toLocaleString("fr-FR")}</p>
                    <p className="mt-1 text-xs text-amber-300">Risque: {appeal.riskScore}/100</p>
                    {appeal.riskReasons?.length ? <p className="text-xs text-slate-400">{appeal.riskReasons.join(" • ")}</p> : null}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      appeal.status === "OPEN"
                        ? "bg-amber-500/20 text-amber-300"
                        : appeal.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {appeal.status}
                  </span>
                </div>

                <p className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">{appeal.message}</p>

                {appeal.status === "OPEN" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => reviewAppeal(appeal.id, "APPROVED")}
                      disabled={busyAppealId === appeal.id}
                      className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-semibold text-[#041127] disabled:opacity-60"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => reviewAppeal(appeal.id, "REJECTED")}
                      disabled={busyAppealId === appeal.id}
                      className="rounded-lg bg-red-400 px-3 py-1 text-xs font-semibold text-[#041127] disabled:opacity-60"
                    >
                      Rejeter
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    Traite: {appeal.reviewedAt ? new Date(appeal.reviewedAt).toLocaleString("fr-FR") : "-"}
                    {appeal.reviewNote ? ` | Note: ${appeal.reviewNote}` : ""}
                  </p>
                )}
              </div>
            ))}
            {!pagedAppeals.length ? <p className="px-4 py-6 text-sm text-slate-400">Aucun recours pour ce filtre.</p> : null}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-slate-300">
            <span>
              Page {safeAppealsPage}/{appealsTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={safeAppealsPage <= 1}
                onClick={() => setAppealsPage((page) => Math.max(1, page - 1))}
                className="rounded-lg bg-white/10 px-3 py-1 disabled:opacity-40"
              >
                Precedent
              </button>
              <button
                disabled={safeAppealsPage >= appealsTotalPages}
                onClick={() => setAppealsPage((page) => Math.min(appealsTotalPages, page + 1))}
                className="rounded-lg bg-white/10 px-3 py-1 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-gold">{status}</p>
      </section>
    </AdminGuard>
  );
}
