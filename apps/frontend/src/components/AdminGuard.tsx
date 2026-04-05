"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessAdmin, getStoredUser, isLoggedIn } from "../lib/session";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/auth?next=/admin");
      return;
    }

    const user = getStoredUser();
    if (!canAccessAdmin(user)) {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="glass rounded-2xl p-4 text-sm text-slate-300">Verification des permissions...</div>;
  }

  return <>{children}</>;
}
