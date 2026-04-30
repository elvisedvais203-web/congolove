import { SectionHeader } from "../../components/nextalksectionheader";

export default function SafetyPage() {
  return (
    <section className="space-y-6 animate-fade-in">
      <SectionHeader title="Securite" accent="pink" />

      <div className="glass neon-border-pink rounded-4xl p-6">
        <p className="text-sm text-slate-300">
          La securite est une priorite sur Solola. Notre equipe combine verification des comptes, moderation automatique
          et moderation humaine pour maintenir une communaute respectueuse.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="glass card-hover neon-border rounded-3xl p-5">
          <h2 className="font-heading text-lg text-white">Compte et acces</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Connectez-vous uniquement via la verification SMS Firebase.</li>
            <li>Verifiez toujours que votre numero est correct (+243...).</li>
            <li>Ne partagez jamais vos codes de verification.</li>
            <li>Activez les notifications de connexion inhabituelles.</li>
          </ul>
        </article>
        <article className="glass card-hover neon-border-violet rounded-3xl p-5">
          <h2 className="font-heading text-lg text-white">Protection des conversations</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Bloquez immediatement tout profil agressif ou suspect.</li>
            <li>Signalez les contenus offensants en un clic.</li>
            <li>Evitez de partager votre adresse, vos codes OTP ou des donnees sensibles.</li>
            <li>Utilisez l appel audio/video uniquement apres verification mutuelle.</li>
          </ul>
        </article>
        <article className="glass card-hover neon-border-gold rounded-3xl p-5">
          <h2 className="font-heading text-lg text-white">Rencontres reelles</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Preferez un lieu public pour le premier rendez-vous.</li>
            <li>Informez un proche de votre deplacement.</li>
            <li>Partagez votre localisation avec un ami de confiance.</li>
            <li>Quittez la rencontre si vous vous sentez en danger.</li>
          </ul>
        </article>
        <article className="glass card-hover neon-border rounded-3xl p-5">
          <h2 className="font-heading text-lg text-white">Signaler un incident</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-300">
            <li>Ouvrez le profil ou la conversation concernee.</li>
            <li>Cliquez sur Signaler puis choisissez le motif.</li>
            <li>Ajoutez un commentaire si necessaire.</li>
            <li>Notre equipe traite le signalement sous 24h.</li>
          </ol>
        </article>
      </div>

      <div className="glass rounded-3xl border border-white/10 p-5">
        <p className="text-sm text-slate-400">
          En cas d urgence physique, contactez d abord les services de securite locaux. L application ne remplace pas les autorites competentes.
        </p>
      </div>
    </section>
  );
}
