import { SectionHeader } from "../../components/SectionHeader";

export default function AboutPage() {
  return (
    <section>
      <SectionHeader title="A propos" subtitle="Une plateforme de rencontre concue pour la RDC" />
      <div className="grid gap-4 md:grid-cols-3">
        <article className="glass rounded-2xl p-4">
          <h2 className="font-heading text-lg">Vision</h2>
          <p className="mt-2 text-sm text-slate-300">Connecter des profils serieux avec une experience locale, rapide et fiable.</p>
        </article>
        <article className="glass rounded-2xl p-4">
          <h2 className="font-heading text-lg">Fintech locale</h2>
          <p className="mt-2 text-sm text-slate-300">Paiements Mobile Money natifs pour abonnement, boosts et options premium.</p>
        </article>
        <article className="glass rounded-2xl p-4">
          <h2 className="font-heading text-lg">Performance</h2>
          <p className="mt-2 text-sm text-slate-300">Optimise pour smartphones Android et connexions 3G ou instables.</p>
        </article>
      </div>
    </section>
  );
}
