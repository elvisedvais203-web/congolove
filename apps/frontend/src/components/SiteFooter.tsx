import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 py-8 text-sm text-slate-400">
      <div className="mb-6 h-px w-full bg-gradient-neon opacity-70" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p>KongoLove RDC - plateforme de rencontre professionnelle et securisee.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/about" className="transition hover:neon-text">A propos</Link>
          <Link href="/help" className="transition hover:neon-text">Aide</Link>
          <Link href="/safety" className="transition hover:neon-text">Securite</Link>
          <Link href="/contact" className="transition hover:neon-text">Contact</Link>
          <Link href="/legal/terms" className="transition hover:neon-text">Conditions</Link>
          <Link href="/legal/privacy" className="transition hover:neon-text">Confidentialite</Link>
          <Link href="/legal/cookies" className="transition hover:neon-text">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
