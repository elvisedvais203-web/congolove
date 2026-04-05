import { SectionHeader } from "../../../components/SectionHeader";
import { AdminGuard } from "../../../components/AdminGuard";

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <section>
        <SectionHeader title="Admin utilisateurs" subtitle="Gestion des comptes, verification et bannissement" />
        <div className="glass rounded-2xl p-5 text-sm text-slate-300">
          Table admin utilisateurs a connecter sur /api/admin/users.
        </div>
      </section>
    </AdminGuard>
  );
}
