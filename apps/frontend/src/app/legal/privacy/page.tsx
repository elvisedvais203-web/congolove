import { SectionHeader } from "../../../components/SectionHeader";

export default function PrivacyPage() {
  return (
    <section className="space-y-5 animate-fade-in">
      <SectionHeader title="Politique de confidentialite" subtitle="Protection et traitement des donnees" accent="violet" />
      <article className="glass neon-border-violet rounded-3xl p-5 text-sm text-slate-300 space-y-4">
        <p>Vos donnees sont utilisees pour la connexion, le matching, la securite et la personnalisation de l experience.</p>
        <p>Nous mettons en place des mesures techniques et organisationnelles pour proteger vos informations.</p>
        <h3 className="font-heading text-white text-base">1. Donnees collectees</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Profil: nom affiche, bio, age, ville, interets, medias.</li>
          <li>Compte: email, numero de telephone, historique de connexion.</li>
          <li>Utilisation: likes, messages, rapports de moderation, preferences.</li>
        </ul>
        <h3 className="font-heading text-white text-base">2. Finalites</h3>
        <p>Fournir le service, ameliorer la qualite du matching, prevenir la fraude et respecter les obligations legales.</p>
        <h3 className="font-heading text-white text-base">3. Partage des donnees</h3>
        <p>Les donnees ne sont pas vendues. Elles peuvent etre partagees avec des sous-traitants techniques strictement necessaires (hebergement, securite, support paiement).</p>
        <h3 className="font-heading text-white text-base">4. Vos droits</h3>
        <p>Vous pouvez demander acces, rectification, suppression ou export de vos donnees via le support.</p>
      </article>
    </section>
  );
}
