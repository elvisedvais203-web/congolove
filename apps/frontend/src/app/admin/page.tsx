"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/nextalksectionheader";
import api from "../../lib/nextalkapi";
import { AdminGuard } from "../../components/nextalkadminguard";
import Link from "next/link";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    api.get("/moderation/admin/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStatsError(true));
  }, []);

  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin" />
        {statsError && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            Impossible de charger les statistiques. Verifiez que le backend est accessible et que la base de donnees est migree.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Utilisateurs", value: stats?.users ?? 0 },
            { label: "Abonnements actifs", value: stats?.activeSubscriptions ?? 0 },
            { label: "Matches", value: stats?.matches ?? 0 },
            { label: "Messages", value: stats?.messages ?? 0 }
          ].map((item) => (
            <article key={item.label} className="glass rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-300">{item.label}</p>
              <p className="mt-2 font-heading text-3xl text-white">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Revenus</p>
            <p className="mt-2 font-heading text-3xl text-white">{(stats?.successfulPaymentsTotalCdf ?? 0).toLocaleString("fr-FR")} CDF</p>
            <p className="text-xs text-slate-400">Total des paiements confirmes</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Signalements</p>
            <p className="mt-2 font-heading text-3xl text-white">{stats?.reports ?? 0}</p>
            <p className="text-xs text-slate-400">File de moderation active</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Transactions</p>
            <p className="mt-2 font-heading text-3xl text-white">{stats?.successfulPaymentsCount ?? 0} / {stats?.paymentsCount ?? 0}</p>
            <p className="text-xs text-slate-400">Succes / total des paiements</p>
          </article>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Link href="/admin/users" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">
            Gestion utilisateurs
          </Link>
          <Link href="/admin/reports" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">
            Moderation signalements
          </Link>
          <Link href="/admin/restrictions" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">
            Restrictions et recours
          </Link>
          <Link href="/admin/analytics" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">
            Analytics et retention
          </Link>
          <Link href="/premium" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">
            Paiements et offres (Free/Premium)
          </Link>
          <Link href="/safety" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">
            Parametres systeme securite et API
          </Link>
        </div>
      </section>
    </AdminGuard>
  );
}
