import { SectionHeader } from "../../../components/SectionHeader";

export default function PrivacyPage() {
  return (
    <section>
      <SectionHeader title="Politique de confidentialite" subtitle="Protection et traitement des donnees" />
      <article className="glass rounded-2xl p-5 text-sm text-slate-300">
        <p>Vos donnees sont utilisees pour la connexion, le matching, la securite et la personnalisation de l experience.</p>
        <p className="mt-3">Nous mettons en place des mesures de securite techniques et organisationnelles pour proteger vos informations.</p>
      </article>
    </section>
  );
}
