import { SectionHeader } from "../../components/SectionHeader";

export default function SafetyPage() {
  return (
    <section>
      <SectionHeader title="Securite" subtitle="Protegez vos donnees et vos interactions" />
      <div className="grid gap-4 md:grid-cols-2">
        <article className="glass rounded-2xl p-4">
          <h2 className="font-heading text-lg">Compte et acces</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            <li>Utilisez un mot de passe unique et fort.</li>
            <li>Activez l OTP par numero RDC.</li>
            <li>Ne partagez jamais vos codes de verification.</li>
          </ul>
        </article>
        <article className="glass rounded-2xl p-4">
          <h2 className="font-heading text-lg">Rencontres reelles</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            <li>Preferez un lieu public pour le premier rendez-vous.</li>
            <li>Informez un proche de votre deplacement.</li>
            <li>Signalez tout comportement suspect.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
