import type { Metadata } from "next";
import Link from "next/link";
import "../styles/globals.css";
import { MobileNav } from "../components/nextalkmobilenav";
import { DesktopNav } from "../components/nextalkdesktopnav";
import { FloatingMessagesPill } from "../components/nextalkfloatingmessagespill";
import { SiteFooter } from "../components/nextalksitefooter";
import { UserPreferencesBoot } from "../components/nextalkuserpreferencesboot";
import { SololaThemedLogo } from "../components/sololathemedlogo";

export const metadata: Metadata = {
  title: "Solola",
  description: "Une application qui vous appartient, pour parler, partager et vous connecter à votre facon.",
  metadataBase: new URL("https://nextalk.app"),
  icons: {
    icon: [
      { url: "/branding/nexttalk-icon-192-tight.png", sizes: "192x192", type: "image/png", media: "(prefers-color-scheme: dark)" },
      { url: "/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/branding/nexttalk-icon-512-tight.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [
      { url: "/branding/nexttalk-icon-192-tight.png", media: "(prefers-color-scheme: dark)" },
      { url: "/branding/apple-touch-icon.png", media: "(prefers-color-scheme: light)" }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="app-shell">
          <DesktopNav />
          <div className="tg-topbar px-4 py-3 md:px-8">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2" aria-label="Solola accueil">
                <SololaThemedLogo
                  width={36}
                  height={36}
                  className="rounded-lg [transform:rotate(180deg)_scaleX(-1)_scaleY(-1)]"
                  priority
                />
                <div>
                  <p className="text-sm font-semibold text-white">Solola</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">TALA • BISA • ZONGA</p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 md:flex">
                  <Link href="/messages" className="wa-pill wa-pill-active px-3 py-1.5 text-xs font-semibold">Messages</Link>
                  <Link href="/stories" className="wa-pill px-3 py-1.5 text-xs">Stories</Link>
                  <Link href="/settings" className="wa-pill px-3 py-1.5 text-xs">Parametres</Link>
                </div>
              </div>
            </div>
          </div>
          <main className="min-h-screen w-full pb-24 md:pb-8 md:pl-[76px]">
            <UserPreferencesBoot />
            <div className="mx-auto w-full max-w-6xl px-4 pt-5 md:px-8 md:pt-6">
              {children}
              <SiteFooter />
            </div>
          </main>
          <MobileNav />
          <FloatingMessagesPill />
        </div>
      </body>
    </html>
  );
}
