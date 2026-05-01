"use client";

import { useEffect } from "react";

export default function GlobalErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep a visible trace in browser console for quick debugging.
    console.error(error);
  }, [error]);

  return (
    <section className="glass mx-auto mt-10 max-w-2xl rounded-3xl p-6 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Incident detecte</p>
      <h2 className="mt-2 font-heading text-2xl text-white">Une erreur est survenue</h2>
      <p className="mt-2 text-sm text-slate-300">
        L'application a capture le probleme. Vous pouvez relancer cette vue sans perdre votre session.
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button onClick={reset} className="rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
          Reessayer
        </button>
        <a href="/dashboard" className="rounded-xl border border-white/20 px-4 py-2 text-slate-200">
          Retour tableau de bord
        </a>
      </div>
      {error.digest ? <p className="mt-3 text-xs text-slate-500">Ref: {error.digest}</p> : null}
    </section>
  );
}
