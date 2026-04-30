"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { canAccessAdmin, getStoredUser } from "../lib/nextalksession";
import { SololaThemedLogo } from "./sololathemedlogo";

const baseLinks = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/reels", label: "Reels", icon: "reels" },
  { href: "/dashboard", label: "Tableau", icon: "compass" },
  { href: "/messages", label: "Messages", icon: "message" },
  { href: "/stories", label: "Stories", icon: "story" },
  { href: "/network", label: "Reseau", icon: "users" },
  { href: "/profile", label: "Profil", icon: "profile" },
  { href: "/settings", label: "Parametres", icon: "menu" }
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const cls = active ? "text-white" : "text-slate-300";

  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }
  if (icon === "compass") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="m14.5 9.5-2.7 1-1 2.7 2.7-1 1-2.7Z" />
      </svg>
    );
  }
  if (icon === "message") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16v10H8l-4 4V6Z" />
      </svg>
    );
  }
  if (icon === "story") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4V8Z" />
      </svg>
    );
  }
  if (icon === "reels") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="3.5" width="16" height="17" rx="3" />
        <path d="m10 9 5 3-5 3V9Z" />
      </svg>
    );
  }
  if (icon === "users") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="9" r="3" />
        <path d="M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5" />
        <path d="M16 8a3 3 0 1 1 0 6" />
      </svg>
    );
  }
  if (icon === "profile") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.7-3.2 4.3-5 8-5s6.3 1.8 8 5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setShowAdmin(canAccessAdmin(user));
  }, [pathname]);

  const links = useMemo(() => {
    if (!showAdmin) {
      return baseLinks;
    }
    return [...baseLinks, { href: "/admin", label: "Admin", icon: "menu" }];
  }, [showAdmin]);

  return (
    <aside className="ig-rail group fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-[#08101fe6] backdrop-blur-xl md:block">
      <div className="flex h-full flex-col">
        <div className="px-3 pb-3 pt-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link href="/" className="flex items-center justify-center" aria-label="Solola accueil" title="Solola">
              <SololaThemedLogo width={44} height={44} className="rounded-xl" priority />
            </Link>
            <div className="hidden min-w-0 flex-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
              <p className="truncate font-heading text-base font-bold text-white">Solola</p>
              <p className="truncate text-[11px] text-slate-400">TALA • BISA • ZONGA</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2">
          <ul className="space-y-2">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const showNotifBadge = link.href === "/network";
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    title={link.label}
                    className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] transition-all duration-200 ${
                      active
                        ? "nav-active-bg text-white font-semibold"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <NavIcon icon={link.icon} active={active} />
                    <span className="hidden min-w-0 flex-1 truncate text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
                      {link.label}
                    </span>
                    {showNotifBadge && (
                      <span className="absolute left-10 top-2 rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] group-hover:left-[170px] transition-all duration-200">
                        6
                      </span>
                    )}
                    {active && (
                      <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[#38d37f] shadow-[0_0_10px_rgba(56,211,127,0.8)]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-2 pb-5">
          <div className="flex items-center justify-center rounded-2xl px-3 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
            <span className="hidden min-w-0 flex-1 truncate text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
              Plus
            </span>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-500 group-hover:hidden">Solola</p>
        </div>
      </div>
    </aside>
  );
}
