"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { canAccessAdmin, getStoredUser } from "../lib/nextalksession";
import { SololaThemedLogo } from "./sololathemedlogo";

const baseLinks = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "#create", label: "+", icon: "plus" },
  { href: "/reels", label: "Reels", icon: "reels" },
  { href: "/search", label: "Recherche", icon: "search" },
  { href: "/messages", label: "Messages", icon: "message" }
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const cls = active ? "text-white" : "text-slate-400";

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
  if (icon === "story") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4V8Z" />
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
  if (icon === "search") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
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
  if (icon === "plus") {
    return (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cls}`} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.7-3.2 4.3-5 8-5s6.3 1.8 8 5" />
    </svg>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [showAdmin, setShowAdmin] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setShowAdmin(canAccessAdmin(user));
  }, [pathname]);

  const links = useMemo(() => {
    if (!showAdmin) {
      return baseLinks;
    }
    return [...baseLinks, { href: "/admin", label: "Admin", icon: "profile" }];
  }, [showAdmin]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#08101ff2] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <div className="mb-1 flex items-center justify-center">
        <SololaThemedLogo width={22} height={22} className="rounded-md opacity-85" />
      </div>
      <ul className={`mx-auto grid max-w-xl gap-1 text-center ${links.length > 5 ? "grid-cols-6" : "grid-cols-5"}`}>
        {links.map((link) => {
          const isCreate = link.icon === "plus";
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              {isCreate ? (
                <button
                  type="button"
                  onClick={() => setOpenCreate(true)}
                  className="relative flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-slate-100 transition-all duration-200 hover:bg-white/5"
                  aria-label="Creer"
                >
                  <NavIcon icon={link.icon} active={true} />
                  <span className="text-[10px] leading-none font-medium">Creer</span>
                </button>
              ) : (
                <Link
                  href={link.href}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all duration-200 ${
                    active ? "nav-active-bg text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                  aria-label={link.label}
                >
                  <NavIcon icon={link.icon} active={active} />
                  <span className={`text-[10px] leading-none font-medium ${active ? "nav-active" : ""}`}>{link.label}</span>
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-neoblue shadow-[0_0_8px_rgba(50,184,255,0.9)]" />
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {openCreate ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/60" onClick={() => setOpenCreate(false)}>
          <div
            className="w-full rounded-t-3xl border border-white/10 bg-[#08101f] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold text-white">Creer</p>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/stories" onClick={() => setOpenCreate(false)} className="glass rounded-2xl px-3 py-3 text-center text-sm text-slate-100">Story</Link>
              <Link href="/reels" onClick={() => setOpenCreate(false)} className="glass rounded-2xl px-3 py-3 text-center text-sm text-slate-100">Reel</Link>
              <Link href="/" onClick={() => setOpenCreate(false)} className="glass rounded-2xl px-3 py-3 text-center text-sm text-slate-100">Post</Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
