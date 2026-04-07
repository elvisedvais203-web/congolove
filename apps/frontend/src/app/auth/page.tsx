"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorDestination, setTwoFactorDestination] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("identifier");
      const err = params.get("error");
      if (id) setIdentifier(id);
      if (err) { setStatus(decodeURIComponent(err)); setStatusType("error"); }
    }
  }, []);

  const submit = async () => {
    if (!identifier.trim() || !password.trim()) {
      setStatus("Veuillez remplir tous les champs."); setStatusType("error"); return;
    }
    try {
      setLoading(true); setStatus("");
      const { data } = await api.post("/auth/login", { identifier, password });
      if (data?.requires2fa && data?.challenge?.challengeId) {
        setStatus(`Code de securite envoye a ${String(data.challenge.destination ?? "votre destination")}.`);
        setTwoFactorChallengeId(String(data.challenge.challengeId));
        setTwoFactorDestination(String(data.challenge.destination ?? ""));
        setStatusType("success");
        return;
      }
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      setStatus("Connexion reussie."); setStatusType("success");
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next ?? "/dashboard");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Identifiants incorrects."); setStatusType("error");
    } finally { setLoading(false); }
  };

  const verify2fa = async () => {
    if (!twoFactorChallengeId || !twoFactorCode.trim()) {
      setStatus("Entrez le code de verification.");
      setStatusType("error");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login/2fa/verify", {
        challengeId: twoFactorChallengeId,
        code: twoFactorCode.trim()
      });
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      setStatus("Connexion securisee reussie.");
      setStatusType("success");
      router.push("/dashboard");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Verification 2FA invalide.");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = async (provider: "google" | "apple") => {
    try {
      setLoading(true); setStatus("");
      const { data } = await api.get<{ configured: boolean; url?: string }>(`/auth/oauth/${provider}/prepare`);
      if (data.configured && data.url) { window.location.href = data.url; return; }
      const email = window.prompt(`Email ${provider === "google" ? "Google" : "Apple"}`)?.trim();
      if (!email) { setStatus("Email requis."); setStatusType("error"); return; }
      const displayName = window.prompt("Nom d affichage (optionnel)")?.trim() || undefined;
      const fallback = await api.post("/auth/social", { provider, email, displayName });
      localStorage.setItem("accessToken", fallback.data.tokens.accessToken);
      localStorage.setItem("refreshToken", fallback.data.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(fallback.data.user));
      router.push("/dashboard");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Connexion sociale indisponible."); setStatusType("error");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-8">
      <section className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-neon shadow-neon-lg">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>
          <h1 className="font-heading text-4xl font-bold text-white">Bon retour</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Connectez-vous a votre compte KongoLove</p>
        </div>

        <div className="glass rounded-4xl p-8 neon-border">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Email ou numero</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
                placeholder="+243 xxx ou email@..."
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                  className="input-neon w-full rounded-2xl px-4 py-3.5 pr-12 text-sm"
                  placeholder="********"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] transition hover:text-neoblue">
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {!twoFactorChallengeId ? (
            <button onClick={() => void submit()} disabled={loading}
              className="btn-neon w-full rounded-2xl py-3.5 text-sm font-bold tracking-wide">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                  </svg>
                  Connexion...
                </span>
              ) : "Se connecter"}
            </button>
            ) : (
              <div className="space-y-3 rounded-2xl border border-neoblue/30 bg-neoblue/5 p-3">
                <p className="text-xs text-slate-300">Verification 2FA active. Code envoye a {twoFactorDestination || "votre destination"}.</p>
                <input
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="input-neon w-full rounded-2xl px-4 py-3 text-sm"
                  placeholder="Code 6 chiffres"
                  inputMode="numeric"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => void verify2fa()} disabled={loading} className="btn-neon rounded-2xl py-3 text-sm font-bold">
                    Valider code
                  </button>
                  <button
                    onClick={() => {
                      setTwoFactorChallengeId(null);
                      setTwoFactorCode("");
                      setTwoFactorDestination("");
                      setStatus("Verification annulee.");
                      setStatusType("error");
                    }}
                    className="btn-outline-neon rounded-2xl py-3 text-sm font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {status && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${statusType === "success"
                ? "border border-[#39ff14]/30 bg-[#39ff14]/10 text-[#39ff14]"
                : "border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f]"}`}>
                {status}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neoblue/30 to-transparent" />
              <span className="text-xs text-[var(--muted)]">ou</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neoviolet/30 to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void socialLogin("google")} disabled={loading}
                className="btn-outline-neon flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold disabled:opacity-50">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" onClick={() => void socialLogin("apple")} disabled={loading}
                className="btn-outline-neon flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold disabled:opacity-50">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </button>
            </div>

            <div className="flex justify-between pt-1 text-xs">
              <Link href="/auth/register" className="font-semibold text-neoblue transition hover:underline">Creer un compte</Link>
              <Link href="/auth/forgot-password" className="text-[var(--muted)] transition hover:text-neoblue">Mot de passe oublie</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
