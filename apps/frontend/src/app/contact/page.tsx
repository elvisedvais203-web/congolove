"use client";

import { useState } from "react";
import { SectionHeader } from "../../components/nextalksectionheader";

const channels = [
  { icon: "MAIL", title: "Email support", value: "support@nextalk.app", desc: "Reponse sous 24 h" },
  { icon: "CHAT", title: "Chat en direct", value: "Disponible 8h-22h", desc: "Lun-Sam" },
  { icon: "TEL", title: "Téléphone", value: "+243 97X XXX XXX", desc: "Appels et messages" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  };

  return (
    <section className="space-y-6 animate-fade-in">
      <SectionHeader title="Contact" />

      <div className="grid gap-3 md:grid-cols-3">
        {channels.map((c) => (
          <div key={c.title} className="glass card-hover neon-border rounded-3xl p-4 flex gap-3 items-start">
            <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-neoblue/30 bg-neoblue/10 px-2 text-[10px] font-semibold text-neoblue">{c.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm">{c.title}</p>
              <p className="text-sm neon-text mt-0.5">{c.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass neon-border-violet rounded-4xl p-6 max-w-2xl">
        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#39ff14]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="font-heading text-xl text-white mb-1">Message envoye !</p>
              <p className="text-sm text-slate-400">Notre equipe vous repond dans les meilleurs delais ouvrables.</p>
            <button onClick={() => { setSent(false); setName(""); setEmail(""); setMsg(""); }} className="mt-5 btn-outline-neon rounded-2xl px-5 py-2.5 text-sm">Envoyer un autre message</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Nom complet</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="input-neon w-full rounded-2xl px-4 py-3 text-sm" placeholder="Votre nom" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Adresse email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" className="input-neon w-full rounded-2xl px-4 py-3 text-sm" placeholder="vous@exemple.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Message</label>
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} required rows={5} className="input-neon w-full resize-none rounded-2xl px-4 py-3 text-sm" placeholder="Decrivez votre demande de facon precise..." />
            </div>
            <button type="submit" disabled={loading} className="btn-neon w-full rounded-2xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {loading ? "Envoi en cours..." : "Envoyer le message"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}