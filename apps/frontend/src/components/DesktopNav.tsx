"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { canAccessAdmin, getStoredUser } from "../lib/session";

const baseLinks = [
  { href: "/dashboard", label: "Accueil", icon: "home" },
  { href: "/discover", label: "Explorer", icon: "compass" },
  { href: "/messages", label: "Messages", icon: "message" },
  { href: "/stories", label: "Stories", icon: "story" },
  { href: "/network", label: "Reseau", icon: "users" },
  { href: "/profile", label: "Profil", icon: "profile" },
  { href: "/settings", label: "Plus", icon: "menu" }
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#080c1be6] backdrop-blur md:block">
      <div className="flex h-full flex-col">
        <div className="px-6 pb-4 pt-7">
          <Link href="/" className="inline-flex items-center" aria-label="KongoLove accueil">
            <Image
              src="/branding/congolove-logo-horizontal-transparent.png"
              alt="Logo CongoLove"
              width={220}
              height={80}
              priority
              className="h-11 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1.5">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition-all duration-200 ${
                      active
                        ? "nav-active-bg text-neoblue font-semibold"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <NavIcon icon={link.icon} active={active} />
                    <span className="font-medium">{link.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neoblue shadow-[0_0_6px_rgba(50,184,255,1)]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-6 pb-6 text-xs text-slate-500">Concu par Edvais Makina</div>
      </div>
    </aside>
  );
}
