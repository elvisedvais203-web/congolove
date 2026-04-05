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
  { href: "/profile", label: "Profil" },
  { href: "/settings", label: "Reglages" }
];

export function MobileNav() {
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#080c1bcc] p-3 backdrop-blur-xl md:hidden">
      <ul className={`mx-auto grid max-w-xl gap-2 text-center text-xs text-slate-300 ${links.length > 6 ? "grid-cols-7" : "grid-cols-6"}`}>
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block rounded-xl px-2 py-2 ${
                  active ? "bg-neoblue/20 text-neoblue" : "hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
