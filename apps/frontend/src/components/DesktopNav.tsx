"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { canAccessAdmin, getStoredUser } from "../lib/session";

const baseLinks = [
  { href: "/dashboard", label: "Feed" },
  { href: "/messages", label: "Chats" },
  { href: "/stories", label: "Statut" },
  { href: "/discover", label: "Decouvrir" },
  { href: "/network", label: "Reseau" },
  { href: "/profile", label: "Profil" },
  { href: "/settings", label: "Reglages" }
];

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
    return [...baseLinks, { href: "/admin", label: "Admin" }];
  }, [showAdmin]);

  return (
    <header className="mb-6 hidden items-center justify-between rounded-2xl border border-white/10 bg-[#0b1124b3] px-4 py-3 backdrop-blur md:flex">
      <Link href="/" className="font-heading text-xl text-white">
        KongoLove
      </Link>
      <nav>
        <ul className="flex flex-wrap gap-2 text-sm text-slate-300">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-lg px-3 py-2 transition ${active ? "bg-neoblue/20 text-neoblue" : "hover:bg-white/5"}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
