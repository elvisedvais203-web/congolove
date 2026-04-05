import { SectionHeader } from "../../components/SectionHeader";

const faq = [
  { q: "Comment verifier mon profil ?", a: "Ajoutez des photos claires et validez votre numero via OTP." },
  { q: "Comment activer le mode economie data ?", a: "Rendez-vous dans Parametres et activez l option dediee." },
  { q: "Que faire en cas d abus ?", a: "Utilisez Signalement depuis le profil ou la conversation." }
];

export default function HelpPage() {
  return (
    <section>
      <SectionHeader title="Centre d aide" subtitle="FAQ, support et bonnes pratiques" />
      <div className="space-y-3">
        {faq.map((item) => (
          <article key={item.q} className="glass rounded-2xl p-4">
            <h2 className="font-heading text-lg">{item.q}</h2>
            <p className="mt-2 text-sm text-slate-300">{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
