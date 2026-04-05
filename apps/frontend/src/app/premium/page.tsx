"use client";

import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { buyPremium } from "../../services/payments";

const providers = ["airtel_money", "orange_money", "m_pesa", "africell_money", "afrimoney"];

export default function PremiumPage() {
  const [provider, setProvider] = useState(providers[0]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const pay = async () => {
    const payment = await buyPremium(provider, phone, 15000);
    setMessage(`Paiement ${payment.status} via ${provider}`);
  };

  return (
    <section>
      <SectionHeader title="Premium" subtitle="Abonnement mensuel via Mobile Money local" />
      <div className="glass max-w-xl rounded-3xl p-5">
        <ul className="mb-4 space-y-2 text-sm text-slate-200">
          <li>Messages illimites</li>
          <li>Voir qui a like</li>
          <li>Boost profil et mode invisible</li>
          <li>Media HD illimites</li>
        </ul>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2">
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-3 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2"
          placeholder="Numero Mobile Money"
        />
        <button onClick={pay} className="mt-3 w-full rounded-xl bg-gold px-4 py-3 font-semibold text-[#1a1305]">
          Payer 15 000 CDF
        </button>
        <p className="mt-3 text-sm text-neoblue">{message}</p>
      </div>
    </section>
  );
}
