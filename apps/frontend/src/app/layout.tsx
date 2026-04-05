import type { Metadata } from "next";
import "../styles/globals.css";
import { MobileNav } from "../components/MobileNav";
import { DesktopNav } from "../components/DesktopNav";
import { SiteFooter } from "../components/SiteFooter";
import { GlobalSearchBar } from "../components/GlobalSearchBar";

export const metadata: Metadata = {
  title: "KongoLove",
  description: "Plateforme de rencontre mobile-first pour la RDC"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <DesktopNav />
          <GlobalSearchBar />
          {children}
          <SiteFooter />
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
