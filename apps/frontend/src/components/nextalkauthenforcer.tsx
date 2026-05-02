"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "../lib/nextalksession";

const PUBLIC_PREFIXES = ["/auth"];

export function AuthEnforcer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isPublic) {
      return;
    }
    if (!isLoggedIn()) {
      router.replace("/auth");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
