import { SectionHeader } from "../../components/nextalksectionheader";

const stats = [
  { value: "50K+", label: "Utilisateurs actifs", color: "blue" },
  { value: "12", label: "Villes couvertes", color: "violet" },
  { value: "98%", label: "Indice de securite", color: "green" },
  { value: "4.8", label: "Note moyenne", color: "gold" },
];

const pillars = [
  { icon: "V", title: "Vision", accent: "blue", desc: "Creer un espace de rencontres authentiques pour la RDC et la diaspora africaine. Une app pensee pour notre culture, nos valeurs et notre mode de vie." },
  { icon: "F", title: "Fintech locale", accent: "gold", desc: "Paiements Mobile Money natifs (Airtel, Orange, M-Pesa) pour abonnement, boosts et options Premium. Aucune carte bancaire requise." },
  { icon: "P", title: "Performance", accent: "violet", desc: "Optimise pour smartphones Android, connexions 3G. Interface legere, rapide, meme en offline partiel." },
  { icon: "S", title: "Securite", accent: "pink", desc: "Authentification Firebase par SMS, signalements temps reel, moderation IA et chiffrement de bout en bout pour chaque conversation." },
  { icon: "IA", title: "IA de matching", accent: "blue", desc: "Algorithme de compatibilite base sur les interets, la localisation et les comportements." },
  { icon: "M", title: "Mission", accent: "gold", desc: "Etre la premiere app de rencontre africaine confiante, inclusive et avancee, rayonnant depuis la RDC vers le monde." },
];

const accentMap: Record<string, string> = {
  blue: "neon-border text-neoblue",
  violet: "neon-border-violet text-neoviolet",
  gold: "neon-border-gold text-gold",
  pink: "neon-border-pink text-[#ff3cac]",
  green: "border-[#39ff14]/30 text-[#39ff14]",
};

export default function AboutPage() {
  return (
    <section className="space-y-8 animate-fade-in">
      <SectionHeader title="A propos" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={"glass card-hover rounded-3xl border p-5 text-center " + accentMap[s.color]}>
            <p className="font-heading text-3xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p) => (
          <article key={p.title} className={"glass card-hover rounded-3xl border p-5 " + accentMap[p.accent]}>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-2 text-xs font-semibold text-white">{p.icon}</span>
              <h2 className="font-heading text-lg font-bold text-white">{p.title}</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{p.desc}</p>
          </article>
        ))}
      </div>
      <div className="glass neon-border rounded-4xl p-6 text-center">
        <p className="font-heading text-2xl font-bold text-white mb-2">Rejoignez Solola</p>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">Plus de 50 000 personnes ont deja trouve une connexion authentique. Votre histoire commence ici.</p>
        <a href="/auth" className="btn-neon inline-block rounded-2xl px-8 py-3 font-semibold">Commencer gratuitement</a>
      </div>
    </section>
  );
}