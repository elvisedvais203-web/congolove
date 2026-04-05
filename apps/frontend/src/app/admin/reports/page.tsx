import { SectionHeader } from "../../../components/SectionHeader";
import { AdminGuard } from "../../../components/AdminGuard";

export default function AdminReportsPage() {
  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin signalements" subtitle="Moderation proactive et traitement des abus" />
        <div className="glass rounded-2xl p-5 text-sm text-slate-300">
          Liste des signalements a connecter sur /api/moderation/reports.
        </div>
      </section>
    </AdminGuard>
  );
}
