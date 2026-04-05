import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-white/10 py-8 text-sm text-slate-400">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p>KongoLove RDC - plateforme de rencontre professionnelle et securisee.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-white">A propos</Link>
          <Link href="/help" className="hover:text-white">Aide</Link>
          <Link href="/safety" className="hover:text-white">Securite</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/legal/terms" className="hover:text-white">Conditions</Link>
          <Link href="/legal/privacy" className="hover:text-white">Confidentialite</Link>
          <Link href="/legal/cookies" className="hover:text-white">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
