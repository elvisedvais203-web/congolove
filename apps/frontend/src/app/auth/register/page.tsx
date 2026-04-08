"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return (
    <section className="mx-auto max-w-md glass rounded-3xl p-6 text-center">
      <p className="text-sm text-slate-300">Redirection vers la connexion securisee...</p>
    </section>
  );
}
