import { SectionHeader } from "../../../components/nextalksectionheader";
import { AdminGuard } from "../../../components/nextalkadminguard";

export default function AdminAnalyticsPage() {
  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin analytics" />
        <div className="grid gap-3 md:grid-cols-3">
          {["DAU", "Conversion", "ARPU"].map((kpi) => (
            <article key={kpi} className="glass rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-400">{kpi}</p>
              <p className="mt-2 font-heading text-2xl">-</p>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
