"use client";

import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";

const faqs = [
  { q: "Comment verifier mon profil ?", a: "Ajoutez des photos claires, verifiez votre numero via Firebase SMS et completez au moins 80% de votre profil. Le badge Verifie augmente vos chances de match de 3x." },
  { q: "Comment activer le mode economie data ?", a: "Rendez-vous dans Reglages > Accessibilite > Mode economie data. Les images seront compressees et les videos pausees automatiquement." },
  { q: "Que faire si je recois des messages inappropries ?", a: "Appuyez longuement sur le message, puis selectionnez Signaler. Notre equipe moderera sous 24h. Vous pouvez aussi bloquer l utilisateur depuis son profil." },
  { q: "Comment payer avec Mobile Money ?", a: "Dans Premium, choisissez votre operateur (Airtel, Orange, M-Pesa...), entrez votre numero et confirmez. Un code vous sera envoye par SMS." },
  { q: "Peut-on utiliser KongoLove hors de la RDC ?", a: "Oui. Meme en diaspora, vous pouvez mettre votre ville d origine en RDC ou utiliser la localisation manuelle. Les paiements internationaux seront disponibles prochainement." },
  { q: "Comment supprimer mon compte ?", a: "Reglages > Confidentialite > Supprimer le compte. Toutes vos donnees seront supprimees sous 30 jours conformement au RGPD." },
  { q: "Mon match a disparu, pourquoi ?", a: "Si un match disparait, l une des deux personnes a peut-etre annule le like ou ete suspendue. Un email de notification vous sera envoye." },
  { q: "Y a-t-il une verification des identites ?", a: "Oui, nous utilisons la verification Firebase SMS par numero congolais et un processus de verification photo pour les profils Premium." },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="space-y-6 animate-fade-in">
      <SectionHeader title="Centre d aide" subtitle="FAQ, support et bonnes pratiques" />

      <div className="space-y-2">
        {faqs.map((item, i) => (
          <div key={i} className={"glass rounded-3xl overflow-hidden transition-all " + (open === i ? "neon-border" : "border border-white/10 hover:border-white/20")}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left">
              <span className="font-semibold text-white text-sm pr-4">{item.q}</span>
              <svg viewBox="0 0 24 24" className={"h-4 w-4 shrink-0 text-neoblue transition-transform " + (open === i ? "rotate-180" : "")} fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {open === i && (
              <div className="px-5 pb-5">
                <div className="h-px bg-gradient-neon mb-4" />
                <p className="text-sm text-slate-300 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass neon-border-pink rounded-4xl p-5 flex gap-4 items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff3cac]/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#ff3cac]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">Support direct</p>
          <p className="text-sm text-slate-400 mt-0.5">Vous ne trouvez pas votre reponse ? Contactez-nous directement.</p>
        </div>
        <a href="/contact" className="btn-outline-neon shrink-0 rounded-2xl px-4 py-2 text-sm">Contacter</a>
      </div>
    </section>
  );
}