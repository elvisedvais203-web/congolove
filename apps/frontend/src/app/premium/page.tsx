"use client";

import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { buyPremium } from "../../services/payments";

const providers = ["airtel_money", "orange_money", "m_pesa", "africell_money", "afrimoney"];

export default function PremiumPage() {
  const [provider, setProvider] = useState(providers[0]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    if (!phone.trim()) return;
    try {
      setLoading(true);
      const payment = await buyPremium(provider, phone, 15000);
      setMessage(`Paiement ${payment.status} via ${provider}`);
    } catch {
      setMessage("Erreur lors du paiement. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: "MSG", label: "Messages illimites", desc: "Chattez sans restriction" },
    { icon: "LIKE", label: "Voir qui vous a like", desc: "Acces complet aux likes recus" },
    { icon: "BOOST", label: "Boost profil", desc: "Montez en tete des recherches" },
    { icon: "HIDE", label: "Mode invisible", desc: "Naviguez discretement" },
    { icon: "HD", label: "Medias HD illimites", desc: "Photos et videos haute qualite" },
    { icon: "OK", label: "Badge Verifie", desc: "Affichez votre authenticite" },
  ];

  return (
    <section className="space-y-6 animate-fade-in">
      <SectionHeader title="Premium" subtitle="Debloquez toute l'experience KongoLove" accent="gold" />

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.label} className="glass card-hover neon-border-gold rounded-3xl p-4 flex gap-3 items-start">
            <span className="text-[11px] shrink-0 mt-0.5 rounded-lg border border-gold/30 bg-gold/10 px-2 py-1 font-semibold text-gold">{f.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm">{f.label}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass neon-border-gold rounded-4xl p-6 max-w-xl mx-auto">
        <div className="text-center mb-5">
          <p className="badge-gold inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">Abonnement mensuel</p>
          <p className="font-heading text-4xl font-bold text-white">15 000 <span className="text-lg text-[var(--muted)]">CDF/mois</span></p>
          <p className="text-sm text-[var(--muted)] mt-1">Paiement securise via Mobile Money</p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="premium-provider" className="block text-xs text-[var(--muted)] mb-1.5 font-medium">Operateur Mobile Money</label>
            <select id="premium-provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="input-neon w-full rounded-2xl px-4 py-3 text-sm">
              {providers.map((p) => (
                <option key={p} value={p}>{p.replace("_", " ").toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5 font-medium">Numero Mobile Money</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-neon w-full rounded-2xl px-4 py-3 text-sm"
              placeholder="+243 8XX XXX XXX"
              type="tel"
            />
          </div>
          <button onClick={pay} disabled={loading || !phone.trim()} className="btn-gold w-full rounded-2xl py-3.5 font-bold text-[#1a1305] disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {loading && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {loading ? "Traitement..." : "Payer 15 000 CDF/mois"}
          </button>
        </div>

        {message && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm text-center ${message.includes("Erreur") ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]"}`}>
            {message}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-[var(--muted)]">Annulable a tout moment · Sans frais caches · 100% securise</p>
      </div>
    </section>
  );
}
