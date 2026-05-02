"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DesktopNav } from "./nextalkdesktopnav";
import { FloatingMessagesPill } from "./nextalkfloatingmessagespill";
import { MobileNav } from "./nextalkmobilenav";
import { SiteFooter } from "./nextalksitefooter";
import { SololaThemedLogo } from "./sololathemedlogo";
import { UserPreferencesBoot } from "./nextalkuserpreferencesboot";

export function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isAuth = pathname.startsWith("/auth");

  if (isAuth) {
    return (
      <div className="min-h-screen bg-[#0b0f17]">
        <UserPreferencesBoot />
        <div className="min-h-screen">{children}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DesktopNav />
      <div className="tg-topbar px-4 py-3 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="Solola accueil">
            <SololaThemedLogo width={36} height={36} className="rounded-lg" priority />
            <div>
              <p className="text-sm font-semibold text-white">Solola</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">TALA • BISA • ZONGA</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/messages" className="wa-pill wa-pill-active px-3 py-1.5 text-xs font-semibold">
                Messages
              </Link>
              <Link href="/stories" className="wa-pill px-3 py-1.5 text-xs">
                Stories
              </Link>
              <Link href="/settings" className="wa-pill px-3 py-1.5 text-xs">
                Parametres
              </Link>
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
      <div className="pointer-events-none fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
        <SololaThemedLogo width={30} height={30} className="rounded-lg opacity-80" />
      </div>
    </div>
  );
}
