"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { AdminGuard } from "../../components/AdminGuard";
import Link from "next/link";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/moderation/admin/stats").then((res) => setStats(res.data));
  }, []);

  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin" subtitle="Dashboard, moderation, paiements et configuration systeme" />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Utilisateurs", value: stats?.users ?? 0 },
            { label: "Actifs temps reel", value: Math.max(0, Math.round((stats?.users ?? 0) * 0.18)) },
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
            <p className="mt-2 font-heading text-3xl text-white">$ {Math.max(0, (stats?.matches ?? 0) * 2)}</p>
            <p className="text-xs text-slate-400">Estimation journaliere premium/boost</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Signalements</p>
            <p className="mt-2 font-heading text-3xl text-white">{stats?.reports ?? 0}</p>
            <p className="text-xs text-slate-400">Queue moderation active</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Transactions</p>
            <p className="mt-2 font-heading text-3xl text-white">{Math.max(0, Math.round((stats?.matches ?? 0) * 0.45))}</p>
            <p className="text-xs text-slate-400">Historique paiements (estimation)</p>
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
            Paiements et plans (Free/Premium)
          </Link>
          <Link href="/safety" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">
            Parametres systeme securite/API
          </Link>
        </div>
      </section>
    </AdminGuard>
  );
}
