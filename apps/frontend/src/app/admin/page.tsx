"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { AdminGuard } from "../../components/AdminGuard";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/moderation/admin/stats").then((res) => setStats(res.data));
  }, []);

  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin" subtitle="Moderation, bannissement et analytics" />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Utilisateurs", value: stats?.users ?? 0 },
            { label: "Matches", value: stats?.matches ?? 0 },
            { label: "Messages", value: stats?.messages ?? 0 },
            { label: "Signalements", value: stats?.reports ?? 0 }
          ].map((item) => (
            <article key={item.label} className="glass rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-300">{item.label}</p>
              <p className="mt-2 font-heading text-3xl text-white">{item.value}</p>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
