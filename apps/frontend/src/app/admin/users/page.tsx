"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../../components/SectionHeader";
import { AdminGuard } from "../../../components/AdminGuard";
import api from "../../../lib/api";
import { fetchCsrfToken } from "../../../services/security";

type AdminUserRow = {
  id: string;
  email?: string | null;
  phone: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  reputation: number;
  displayName: string;
  city?: string | null;
  verifiedBadge: boolean;
  verificationStatus: "pending" | "verified" | "rejected" | "unverified";
  reportsCount: number;
  riskScore: number;
  riskReasons?: string[];
  restrictionStatus?: "ACTIVE" | "LIFTED" | null;
  restrictionType?: "SUSPENDED" | "BANNED" | null;
  restrictionUntil?: string | null;
  restrictionReason?: string | null;
  latestVerificationRequestedAt?: string | null;
  latestReviewNote?: string | null;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [status, setStatus] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await api.get<AdminUserRow[]>("/moderation/admin/users");
    setRows(data);
  };

  useEffect(() => {
    load().catch(() => setStatus("Impossible de charger les utilisateurs admin."));
  }, []);

  const review = async (userId: string, decision: "APPROVED" | "REJECTED") => {
    try {
      setLoadingId(userId + decision);
      setStatus("");
      const csrf = await fetchCsrfToken();
      await api.post(
        `/moderation/admin/users/${userId}/review-verification`,
        { decision, note: decision === "APPROVED" ? "Profil verifie par admin" : "Verification refusee" },
        { headers: { "x-csrf-token": csrf } }
      );
      await load();
      setStatus(decision === "APPROVED" ? "Verification approuvee." : "Verification refusee.");
    } catch {
      setStatus("Action admin impossible pour le moment.");
    } finally {
      setLoadingId(null);
    }
  };

  const moderateAccount = async (userId: string, mode: "SUSPEND" | "BAN" | "LIFT") => {
    try {
      setLoadingId(`${userId}:${mode}`);
      setStatus("");
      const csrf = await fetchCsrfToken();

      let reason = "Restriction levee";
      if (mode === "SUSPEND" || mode === "BAN") {
        const raw = window.prompt(mode === "BAN" ? "Motif du bannissement (obligatoire)" : "Motif de la suspension (obligatoire)", "");
        reason = String(raw ?? "").trim();
        if (reason.length < 6) {
          setStatus("Motif obligatoire (minimum 6 caracteres).");
          setLoadingId(null);
          return;
        }
      }

      await api.post(
        `/moderation/admin/users/${userId}/restriction`,
        {
          mode,
          durationDays: mode === "SUSPEND" ? 7 : undefined,
          reason
        },
        { headers: { "x-csrf-token": csrf } }
      );
      await load();
      setStatus(mode === "LIFT" ? "Compte reactive." : mode === "BAN" ? "Compte banni." : "Compte suspendu 7 jours.");
    } catch {
      setStatus("Action de moderation impossible.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin utilisateurs" subtitle="Gestion des comptes, verification et bannissement" />
        <div className="glass overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.8fr_1.3fr] gap-3 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Utilisateur</span>
            <span>Verification</span>
            <span>Risque</span>
            <span>Signalements</span>
            <span>Reputation</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-white/5">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.8fr_1.3fr] gap-3 px-4 py-4 text-sm text-slate-200">
                <div>
                  <p className="font-semibold text-white">{row.displayName}</p>
                  <p className="text-xs text-slate-400">{row.email || row.phone}</p>
                  <p className="text-xs text-slate-500">{row.city || "RDC"} • {row.role}</p>
                  {row.restrictionStatus === "ACTIVE" ? (
                    <p className="mt-1 text-xs text-red-300">
                      {row.restrictionType === "BANNED" ? "Banni" : "Suspendu"}
                      {row.restrictionUntil ? ` jusqu'au ${new Date(row.restrictionUntil).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  ) : null}
                </div>
                <div>
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    row.verificationStatus === "verified"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : row.verificationStatus === "pending"
                        ? "bg-amber-500/15 text-amber-300"
                        : row.verificationStatus === "rejected"
                          ? "bg-red-500/15 text-red-300"
                          : "bg-white/10 text-slate-300"
                  }`}>
                    {row.verificationStatus}
                  </span>
                </div>
                <div>
                  <span className={`font-semibold ${row.riskScore >= 60 ? "text-red-300" : row.riskScore >= 35 ? "text-amber-300" : "text-emerald-300"}`}>
                    {row.riskScore}/100
                  </span>
                </div>
                <div>{row.reportsCount}</div>
                <div>{row.reputation}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void review(row.id, "APPROVED")}
                    disabled={row.verificationStatus !== "pending" || loadingId !== null}
                    className="rounded-lg bg-emerald-400 px-2 py-1 text-xs font-semibold text-[#041127] disabled:opacity-40"
                  >
                    {loadingId === row.id + "APPROVED" ? "..." : "Approuver"}
                  </button>
                  <button
                    onClick={() => void review(row.id, "REJECTED")}
                    disabled={row.verificationStatus !== "pending" || loadingId !== null}
                    className="rounded-lg bg-red-500/80 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {loadingId === row.id + "REJECTED" ? "..." : "Refuser"}
                  </button>
                  <button
                    onClick={() => void moderateAccount(row.id, "SUSPEND")}
                    disabled={loadingId !== null || row.restrictionStatus === "ACTIVE"}
                    className="rounded-lg bg-amber-500/80 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {loadingId === `${row.id}:SUSPEND` ? "..." : "Suspendre 7j"}
                  </button>
                  <button
                    onClick={() => void moderateAccount(row.id, "BAN")}
                    disabled={loadingId !== null || row.restrictionType === "BANNED"}
                    className="rounded-lg bg-red-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {loadingId === `${row.id}:BAN` ? "..." : "Bannir"}
                  </button>
                  <button
                    onClick={() => void moderateAccount(row.id, "LIFT")}
                    disabled={loadingId !== null || row.restrictionStatus !== "ACTIVE"}
                    className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {loadingId === `${row.id}:LIFT` ? "..." : "Reactiver"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-gold">{status}</p>
      </section>
    </AdminGuard>
  );
}
