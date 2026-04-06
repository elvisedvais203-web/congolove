"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../../components/SectionHeader";
import { AdminGuard } from "../../../components/AdminGuard";
import api from "../../../lib/api";

type ReportRow = {
  id: string;
  reason: string;
  createdAt: string;
  reporter: {
    id: string;
    displayName: string;
    phone: string;
  };
  reported: {
    id: string;
    displayName: string;
    phone: string;
    reputation: number;
    verifiedBadge: boolean;
    riskScore: number;
    riskReasons: string[];
  };
};

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get<ReportRow[]>("/moderation/admin/reports")
      .then((res) => setRows(res.data))
      .catch(() => setStatus("Impossible de charger les signalements."));
  }, []);

  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin signalements" subtitle="Moderation proactive et traitement des abus" />
        <div className="grid gap-4">
          {rows.map((row) => (
            <article key={row.id} className="glass rounded-2xl p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Signalement</p>
                  <p className="mt-1 text-base text-white">{row.reason}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Par <span className="font-semibold text-white">{row.reporter.displayName}</span> contre <span className="font-semibold text-white">{row.reported.displayName}</span>
                  </p>
                  <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString("fr-FR")}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                  <p className="text-slate-400">Risque</p>
                  <p className={`mt-1 font-heading text-2xl ${row.reported.riskScore >= 60 ? "text-red-300" : row.reported.riskScore >= 35 ? "text-amber-300" : "text-emerald-300"}`}>
                    {row.reported.riskScore}/100
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Utilisateur signale</p>
                  <p className="mt-2 font-semibold text-white">{row.reported.displayName}</p>
                  <p className="text-sm text-slate-400">{row.reported.phone}</p>
                  <p className="mt-2 text-sm text-slate-300">Reputation: {row.reported.reputation}</p>
                  <p className="text-sm text-slate-300">Badge: {row.reported.verifiedBadge ? "Verifie" : "Non verifie"}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Raisons IA / moderation</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.reported.riskReasons.map((reason) => (
                      <span key={reason} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-3 text-sm text-gold">{status}</p>
      </section>
    </AdminGuard>
  );
}
