"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const suggestedIdentifier = new URLSearchParams(window.location.search).get("identifier");
      if (suggestedIdentifier) {
        setIdentifier(suggestedIdentifier);
      }
    }
  }, []);

  const submit = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { identifier, password });
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      setStatus("Connexion reussie. Redirection...");
      const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
      router.push(next ?? "/dashboard");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Echec de connexion. Verifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md glass rounded-3xl p-6">
      <h1 className="font-heading text-3xl">Connexion</h1>
      <p className="mt-1 text-sm text-slate-300">OTP SMS + JWT sont deja prevus cote API.</p>
      <div className="mt-6 space-y-4">
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3"
          placeholder="Email ou numero"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3"
          placeholder="Mot de passe"
        />
        <button onClick={submit} disabled={loading} className="w-full rounded-xl bg-neoblue px-4 py-3 font-semibold text-[#041127] disabled:opacity-60">
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        <div className="flex justify-between text-xs text-slate-300">
          <Link href="/auth/register" className="hover:text-neoblue">Creer un compte</Link>
          <Link href="/auth/forgot-password" className="hover:text-neoblue">Mot de passe oublie</Link>
        </div>
      </div>
      <p className="mt-4 text-sm text-gold">{status}</p>
    </section>
  );
}
