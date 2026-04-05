import { SectionHeader } from "../../../components/SectionHeader";

export default function TermsPage() {
  return (
    <section>
      <SectionHeader title="Conditions d utilisation" subtitle="Regles de la plateforme" />
      <article className="glass rounded-2xl p-5 text-sm text-slate-300">
        <p>En utilisant KongoLove, vous acceptez de respecter les regles de conduite, la legislation en vigueur et les politiques de moderation.</p>
        <p className="mt-3">Les comptes frauduleux, abusifs ou malveillants peuvent etre suspendus ou bannis.</p>
      </article>
    </section>
  );
}
