import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "../styles/globals.css";
import { MobileNav } from "../components/MobileNav";
import { DesktopNav } from "../components/DesktopNav";
import { SiteFooter } from "../components/SiteFooter";
import { GlobalSearchBar } from "../components/GlobalSearchBar";
import { AiDatingCoach } from "../components/AiDatingCoach";

export const metadata: Metadata = {
  title: "KongoLove",
  description: "Plateforme de rencontre mobile-first pour la RDC",
  metadataBase: new URL("https://app.congolove.com"),
  icons: {
    icon: "/branding/congolove-icon-192.png",
    apple: "/branding/congolove-icon-192.png",
    shortcut: "/branding/congolove-icon-192.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <DesktopNav />
        <main className="min-h-screen w-full pb-24 md:pb-8 md:pl-72">
          <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-8 md:pt-8">
            <div className="mb-4 flex justify-center md:hidden">
              <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1124b3] px-3 py-2" aria-label="KongoLove accueil">
                <Image src="/branding/congolove-logo-square.png" alt="KongoLove" width={36} height={36} priority className="rounded-lg" />
                <span className="font-heading text-lg text-white">KongoLove</span>
              </Link>
            </div>
            <GlobalSearchBar />
            <AiDatingCoach />
            {children}
            <SiteFooter />
          </div>
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
