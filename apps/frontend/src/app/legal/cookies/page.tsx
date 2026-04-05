import { SectionHeader } from "../../../components/SectionHeader";

export default function CookiesPage() {
  return (
    <section>
      <SectionHeader title="Politique cookies" subtitle="Mesure de performance et confort utilisateur" />
      <article className="glass rounded-2xl p-5 text-sm text-slate-300">
        <p>Des cookies peuvent etre utilises pour garder votre session active, ameliorer l interface et analyser la performance.</p>
        <p className="mt-3">Vous pouvez ajuster vos preferences depuis les parametres de votre navigateur.</p>
      </article>
    </section>
  );
}
