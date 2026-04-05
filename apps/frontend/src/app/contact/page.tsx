"use client";

import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <section>
      <SectionHeader title="Contact" subtitle="Partenariats, support et communication" />
      <div className="glass max-w-2xl rounded-2xl p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-white/20 bg-black/20 px-3 py-2" placeholder="Nom" />
          <input className="rounded-xl border border-white/20 bg-black/20 px-3 py-2" placeholder="Email" />
        </div>
        <textarea className="mt-3 min-h-36 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2" placeholder="Message" />
        <button onClick={() => setSent(true)} className="mt-3 rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
          Envoyer
        </button>
        {sent && <p className="mt-3 text-sm text-gold">Message recu. Notre equipe vous repond rapidement.</p>}
      </div>
    </section>
  );
}
