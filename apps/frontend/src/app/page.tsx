import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-8 py-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <div className="mb-4">
            <Image
              src="/branding/congolove-logo-horizontal-transparent.png"
              alt="Logo CongoLove"
              width={320}
              height={128}
              priority
              className="h-auto w-full max-w-xs rounded-xl object-contain"
            />
          </div>
          <p className="mb-3 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs uppercase tracking-widest text-gold">
            Concu pour la RDC
          </p>
          <h1 className="font-heading text-5xl leading-tight text-white">Trouve une vraie connexion, pas juste un swipe.</h1>
          <p className="mt-4 max-w-xl text-slate-300">
            KongoLove combine matching intelligent, chat temps reel, verification identite et securite anti-fake pour des relations serieuses et locales.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth" className="rounded-2xl bg-neoblue px-5 py-3 font-semibold text-[#041127]">
              Commencer
            </Link>
            <Link href="/auth" className="rounded-2xl border border-white/20 px-5 py-3 text-white">
              Se connecter
            </Link>
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <h2 className="font-heading text-xl text-white">Apercu profils</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { name: "Amina", city: "Kinshasa", intent: "Serieux" },
              { name: "Patrick", city: "Goma", intent: "Mariage" },
              { name: "Grace", city: "Lubumbashi", intent: "Amitie" },
              { name: "Cedric", city: "Bukavu", intent: "Serieux" }
            ].map((profile) => (
              <article key={`${profile.name}-${profile.city}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="font-semibold text-white">{profile.name}</p>
                <p className="text-xs text-slate-400">{profile.city}</p>
                <p className="mt-2 inline-flex rounded-full border border-neoblue/30 bg-neoblue/10 px-2 py-0.5 text-[11px] text-neoblue">
                  {profile.intent}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Securite", body: "Verification identite, moderation proactive et anti-fake." },
          { title: "IA locale", body: "Compatibilite basee sur tes interets, intentions et style de discussion." },
          { title: "Performance", body: "Application optimisee pour connexion faible et data saver." },
          { title: "Serieux", body: "Profils avec objectifs clairs: mariage, relation stable, amitie." }
        ].map((item) => (
          <article key={item.title} className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">{item.title}</p>
            <p className="mt-2 text-sm text-slate-200">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            quote: "J'ai trouve une personne serieuse en 2 semaines. Le badge verifie m'a vraiment rassuree.",
            author: "Sarah, Kinshasa"
          },
          {
            quote: "Le chat est rapide meme en 3G. L'experience est simple et propre.",
            author: "Jonas, Matadi"
          },
          {
            quote: "L'IA propose des profils qui me correspondent vraiment. Beaucoup moins de perte de temps.",
            author: "Merveille, Lubumbashi"
          }
        ].map((item) => (
          <article key={item.author} className="glass rounded-2xl p-4">
            <p className="text-sm text-slate-200">"{item.quote}"</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-neoblue">{item.author}</p>
          </article>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d1730] via-[#111a35] to-[#0f1f3d] p-6">
        <h2 className="font-heading text-2xl text-white">Vision produit</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Une plateforme de rencontre intelligente adaptee aux usages locaux: simple, rapide, securisee et localisee RDC.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/discover" className="rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
            Lancer la decouverte
          </Link>
          <Link href="/about" className="rounded-xl border border-white/20 px-4 py-2 text-white">
            En savoir plus
          </Link>
          <Link href="/premium" className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-gold">
            Voir les offres
          </Link>
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="rounded-2xl border border-neoviolet/30 bg-neoviolet/10 p-4">
          <h2 className="font-heading text-xl text-white">Freemium clair</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>Gratuit: likes et messages limites</li>
            <li>Premium: illimite + boost + mode invisible + super like prioritaire</li>
            <li>Paiement: Airtel, Orange, M-Pesa, Africell, AfriMoney</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
