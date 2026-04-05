"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");

  return (
    <section className="mx-auto max-w-md glass rounded-3xl p-6">
      <h1 className="font-heading text-3xl">Mot de passe oublie</h1>
      <p className="mt-2 text-sm text-slate-300">Un code OTP sera envoye sur votre numero RDC.</p>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-4 w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Numero +243..." />
      <button onClick={() => setStatus("Demande envoyee.")} className="mt-3 w-full rounded-xl bg-neoviolet px-4 py-3 font-semibold text-white">Envoyer OTP</button>
      <p className="mt-3 text-sm text-gold">{status}</p>
    </section>
  );
}
