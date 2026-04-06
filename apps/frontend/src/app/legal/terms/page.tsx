import { SectionHeader } from "../../../components/SectionHeader";

export default function TermsPage() {
  return (
    <section className="space-y-5 animate-fade-in">
      <SectionHeader title="Conditions d utilisation" subtitle="Regles de la plateforme" accent="gold" />
      <article className="glass neon-border-gold rounded-3xl p-5 text-sm text-slate-300 space-y-4">
        <p>En utilisant KongoLove, vous acceptez de respecter les regles de conduite, la legislation en vigueur et les politiques de moderation.</p>
        <p>Les comptes frauduleux, abusifs ou malveillants peuvent etre suspendus ou bannis sans preavis.</p>
        <h3 className="font-heading text-white text-base">1. Eligibilite</h3>
        <p>Vous devez etre majeur et fournir des informations exactes. L usurpation d identite est interdite.</p>
        <h3 className="font-heading text-white text-base">2. Comportements interdits</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harcèlement, menaces, propos discriminatoires ou contenus explicites non consentis.</li>
          <li>Spam, escroqueries, phishing, demandes d argent suspectes.</li>
          <li>Utilisation de bots ou automatisation non autorisee.</li>
        </ul>
        <h3 className="font-heading text-white text-base">3. Paiements et abonnements</h3>
        <p>Les offres Premium sont facturees selon le tarif affiche. Les details de remboursement sont traites par le support selon le contexte du paiement.</p>
        <h3 className="font-heading text-white text-base">4. Responsabilites</h3>
        <p>KongoLove fournit une plateforme de mise en relation et ne garantit pas un resultat sentimental. Les utilisateurs restent responsables de leurs rencontres et decisions.</p>
      </article>
    </section>
  );
}
