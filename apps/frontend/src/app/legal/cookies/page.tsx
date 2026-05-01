import { SectionHeader } from "../../../components/nextalksectionheader";

export default function CookiesPage() {
  return (
    <section className="space-y-5 animate-fade-in">
      <SectionHeader title="Politique cookies" accent="blue" />
      <article className="glass neon-border rounded-3xl p-5 text-sm text-slate-300 space-y-4">
        <p>Des cookies peuvent etre utilises pour maintenir votre session active, ameliorer l interface et analyser la performance.</p>
        <h3 className="font-heading text-white text-base">1. Cookies necessaires</h3>
        <p>Indispensables pour l authentification, la securite CSRF et la disponibilite des fonctions essentielles.</p>
        <h3 className="font-heading text-white text-base">2. Cookies analytiques</h3>
        <p>Permettent de mesurer la performance des pages et d identifier les erreurs afin d ameliorer l application.</p>
        <h3 className="font-heading text-white text-base">3. Gestion des preferences</h3>
        <p>Vous pouvez ajuster vos preferences depuis votre navigateur. Le refus de certains cookies peut reduire certaines fonctionnalites.</p>
        <h3 className="font-heading text-white text-base">4. Duree de conservation</h3>
        <p>La duree varie selon le type de cookie. Les cookies de session expirent a la fermeture du navigateur.</p>
      </article>
    </section>
  );
}
