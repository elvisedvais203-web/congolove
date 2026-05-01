"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

function SocialSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const payload = useMemo(() => {
    const accessToken = searchParams.get("accessToken") ?? "";
    const refreshToken = searchParams.get("refreshToken") ?? "";
    const rawUser = searchParams.get("user") ?? "";
    const error = searchParams.get("error") ?? "";
    const provider = searchParams.get("provider") ?? "";

    return {
      accessToken,
      refreshToken,
      rawUser,
      error,
      provider
    };
  }, [searchParams]);

  useEffect(() => {
    if (payload.error) {
      router.replace(`/auth?error=${encodeURIComponent(payload.error)}`);
      return;
    }

    if (!payload.accessToken || !payload.refreshToken || !payload.rawUser) {
      router.replace("/auth?error=Retour+OAuth+incomplet");
      return;
    }

    try {
      const decodedUser = JSON.parse(payload.rawUser);
      localStorage.setItem("accessToken", payload.accessToken);
      localStorage.setItem("refreshToken", payload.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(decodedUser));
      router.replace("/dashboard");
    } catch {
      router.replace("/auth?error=Impossible+de+finaliser+la+connexion+sociale");
    }
  }, [payload, router]);

  return (
    <section className="mx-auto mt-12 max-w-lg rounded-3xl border border-white/15 bg-[#0a1125f0] p-6 text-center">
      <h1 className="font-heading text-3xl text-white">Connexion via reseau social</h1>
      <p className="mt-3 text-sm text-slate-300">
        Finalisation de la connexion {payload.provider ? `(${payload.provider})` : ""}...
      </p>
    </section>
  );
}

export default function SocialSuccessPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto mt-12 max-w-lg rounded-3xl border border-white/15 bg-[#0a1125f0] p-6 text-center">
          <h1 className="font-heading text-3xl text-white">Connexion via reseau social</h1>
          <p className="mt-3 text-sm text-slate-300">Finalisation de la connexion...</p>
        </section>
      }
    >
      <SocialSuccessContent />
    </Suspense>
  );
}
