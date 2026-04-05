import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid gap-8 py-10 md:grid-cols-2 md:items-center">
      <div>
        <p className="mb-3 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs uppercase tracking-widest text-gold">
          Concu pour la RDC
        </p>
        <h1 className="font-heading text-5xl leading-tight text-white">
          Rencontrez des profils authentiques, meme avec un reseau faible.
        </h1>
        <p className="mt-4 max-w-xl text-slate-300">
          KongoLove combine matching intelligent, chat temps reel, media HD et paiements Mobile Money locaux.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/auth" className="rounded-2xl bg-neoblue px-5 py-3 font-semibold text-[#041127]">
            Commencer
          </Link>
          <Link href="/premium" className="rounded-2xl border border-white/20 px-5 py-3 text-white">
            Voir Premium
          </Link>
        </div>
      </div>
      <div className="glass rounded-3xl p-5">
        <div className="rounded-2xl border border-neoviolet/30 bg-neoviolet/10 p-4">
          <h2 className="font-heading text-xl text-white">Freemium clair</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>Gratuit: likes et messages limites</li>
            <li>Premium: illimite + boost + mode invisible</li>
            <li>Paiement: Airtel, Orange, M-Pesa, Africell, AfriMoney</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
