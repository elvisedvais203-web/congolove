"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signInWithPhoneNumber,
  ApplicationVerifier,
  RecaptchaVerifier
} from "firebase/auth";
import { auth } from "../../nextalkfirebase";
import api from "../../lib/nextalkapi";
import { isLoggedIn, storeSession } from "../../lib/nextalksession";
import { SololaThemedLogo } from "../../components/sololathemedlogo";

function formatPhoneInput(value: string) {
  if (!value.startsWith("+")) {
    return `+${value.replace(/[^\d]/g, "")}`;
  }
  return `+${value.slice(1).replace(/[^\d]/g, "")}`;
}

const FIREBASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

type PhoneConfirmationResult = { confirm: (code: string) => Promise<any> };

/** Messages utilisateur pour les erreurs Firebase Auth (telephone / reCAPTCHA). */
function firebaseAuthUserMessage(error: unknown): string {
  const e = error as { code?: string; message?: string };
  const code = typeof e?.code === "string" ? e.code : "";
  const raw = typeof e?.message === "string" ? e.message : "";

  const byCode: Record<string, string> = {
    "auth/invalid-phone-number":
      "Numero de telephone invalide pour Firebase. Utilisez le format international, par ex. +243895966288 (sans espaces).",
    "auth/missing-phone-number": "Numero manquant. Verifiez le champ telephone.",
    "auth/invalid-verification-code":
      "Code SMS incorrect. Verifiez les 6 chiffres et reessayez.",
    "auth/code-expired":
      "Ce code a expire. Demandez un nouveau code avec « Envoyer le code ».",
    "auth/session-expired":
      "La session a expire. Demandez un nouveau code SMS.",
    "auth/too-many-requests":
      "Trop de tentatives. Attendez quelques minutes ou changez de reseau, puis reessayez.",
    "auth/quota-exceeded":
      "Quota SMS Firebase depasse pour ce projet. Reessayez plus tard ou contactez l administrateur (facturation Firebase).",
    "auth/billing-not-enabled":
      "Firebase exige un compte de facturation actif pour envoyer de vrais SMS (Phone Auth hors numeros de test). Dans la console Firebase : ouvrez votre projet, menu Facturation / Upgrade (plan Blaze ou association a Google Cloud Billing), ajoutez un moyen de paiement, puis attendez quelques minutes et reessayez. Alternative en developpement : Authentication > Sign-in method > Phone > Numeros de test (sans SMS reel).",
    "auth/operation-not-allowed":
      "La connexion par telephone n est pas activee dans Firebase Console : Authentication > Sign-in method > Phone > Activer.",
    "auth/unauthorized-domain":
      "Ce site (domaine) n est pas autorise pour Firebase. Dans la console Firebase : Authentication > Settings > Authorized domains, ajoutez localhost (dev) ou votre domaine de production.",
    "auth/captcha-check-failed":
      "Verification reCAPTCHA echouee. Rechargez la page, desactivez les bloqueurs de pub, puis reessayez.",
    "auth/invalid-app-credential":
      "Identifiants Firebase invalides (cle API, App ID ou domaine). Verifiez les variables NEXT_PUBLIC_FIREBASE_* dans le fichier .env et la configuration du projet Firebase.",
    "auth/app-not-authorized":
      "Cette application n est pas autorisee a utiliser Firebase Authentication avec ce projet.",
    "auth/network-request-failed":
      "Connexion reseau vers Firebase impossible. Verifiez Internet ou un pare-feu / VPN.",
    "auth/missing-client-identifier":
      "Configuration Firebase incomplete cote client (cles ou App ID manquants)."
  };

  if (code && byCode[code]) {
    return byCode[code];
  }

  const text = `${raw} ${code}`.toLowerCase();
  if (text.includes("invalid-phone-number")) {
    return "Numero invalide. Format attendu: +243...";
  }
  if (text.includes("too-many-requests")) {
    return "Trop de tentatives. Veuillez reessayer plus tard.";
  }
  if (text.includes("invalid-verification-code")) {
    return "Code invalide. Veuillez verifier le SMS.";
  }
  if (text.includes("session-expired") || text.includes("code-expired")) {
    return "Code expire. Demandez un nouveau code.";
  }
  if (text.includes("network-request-failed") || text.includes("network")) {
    return "Connexion reseau echouee. Verifiez votre connexion Internet.";
  }
  if (text.includes("billing-not-enabled")) {
    return byCode["auth/billing-not-enabled"];
  }

  const devHint =
    process.env.NODE_ENV === "development" && (code || raw)
      ? ` (technique: ${code || "sans code"}${raw ? ` — ${raw.slice(0, 120)}` : ""})`
      : "";
  return `Une erreur est survenue lors de l envoi ou de la verification.${devHint}`;
}

export default function AuthClientSimple() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const apiConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL) || process.env.NODE_ENV !== "production";
  const [tab, setTab] = useState<"phone" | "email">("email");
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace(nextPath);
      return;
    }
    const root = document.documentElement;
    const prevTheme = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (prevTheme == null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", prevTheme);
    };
  }, []);

  const [phoneNumber, setPhoneNumber] = useState("+243");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<PhoneConfirmationResult | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success">("success");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);

  const getOrCreateRecaptchaVerifier = (): ApplicationVerifier | undefined => {
    try {
      // Essayer d'utiliser le verifier global si disponible
      if ((window as any).recaptchaVerifier) {
        return (window as any).recaptchaVerifier;
      }

      // Créer un nouveau verifier de manière plus simple
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          console.log("reCAPTCHA verified");
        },
        "error-callback": () => {
          console.warn("reCAPTCHA error");
        }
      });

      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (error) {
      console.warn("Cannot create reCAPTCHA verifier:", error);
      return undefined;
    }
  };

  const sendCode = async () => {
    try {
      setSending(true);
      setStatus("");

      const normalizedPhone = formatPhoneInput(phoneNumber.trim());

      const verifier = getOrCreateRecaptchaVerifier();

      if (!verifier) {
        setStatus("reCAPTCHA indisponible. Rechargez la page puis reessayez.");
        setStatusType("error");
        return;
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        normalizedPhone,
        verifier
      );

      setConfirmationResult(confirmation);
      setStatus(`Code SMS envoye au numero ${normalizedPhone}.`);
      setStatusType("success");
    } catch (error: unknown) {
      console.error("[auth] signInWithPhoneNumber", error);
      setStatus(firebaseAuthUserMessage(error));
      setStatusType("error");

      // Nettoyer le verifier
      try {
        const verifier = (window as any).recaptchaVerifier;
        if (verifier?.clear) {
          await verifier.clear();
        }
      } catch {
        // Ignorer
      }
      (window as any).recaptchaVerifier = null;
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (!confirmationResult) {
      setStatus("Veuillez d'abord demander le code SMS.");
      setStatusType("error");
      return;
    }

    if (otpCode.trim().length < 6) {
      setStatus("Entrez le code OTP a 6 chiffres.");
      setStatusType("error");
      return;
    }

    try {
      setVerifying(true);
      setStatus("");
      const credential = await confirmationResult.confirm(otpCode.trim());
      const idToken = await credential.user.getIdToken(true);

      const backend = await api.post("/auth/firebase/verify", {
        idToken,
        displayName: credential.user.displayName ?? undefined
      });

      storeSession({
        accessToken: backend.data.tokens.accessToken,
        refreshToken: backend.data.tokens.refreshToken,
        user: backend.data.user
      });

      setStatus("Connexion reussie.");
      setStatusType("success");
      setTimeout(() => {
        router.push(nextPath);
      }, 500);
    } catch (error: unknown) {
      console.error("[auth] verifyCode / backend", error);
      const e = error as {
        code?: string;
        message?: string;
        response?: { data?: { message?: string } };
      };
      if (typeof e?.code === "string" && e.code.startsWith("auth/")) {
        setStatus(firebaseAuthUserMessage(error));
      } else {
        setStatus(
          e?.response?.data?.message ??
            e?.message ??
            firebaseAuthUserMessage(error)
        );
      }
      setStatusType("error");
    } finally {
      setVerifying(false);
    }
  };

  const submitEmailAuth = async () => {
    try {
      setSubmittingEmail(true);
      setStatus("");

      if (!email.trim()) {
        setStatus("Entrez votre email.");
        setStatusType("error");
        return;
      }

      if (authMode === "register") {
        if (password.length < 8) {
          setStatus("Mot de passe trop court (minimum 8 caracteres).");
          setStatusType("error");
          return;
        }
        if (password !== confirmPassword) {
          setStatus("Les mots de passe ne correspondent pas.");
          setStatusType("error");
          return;
        }
        const resp = await api.post("/auth/email/register", {
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined
        });
        storeSession({
          accessToken: resp.data.tokens.accessToken,
          refreshToken: resp.data.tokens.refreshToken,
          user: resp.data.user
        });
        setStatus("Compte cree. Connexion reussie.");
        setStatusType("success");
        setTimeout(() => router.push(nextPath), 500);
        return;
      }

      if (authMode === "login") {
        const resp = await api.post("/auth/email/login", {
          email: email.trim(),
          password
        });
        storeSession({
          accessToken: resp.data.tokens.accessToken,
          refreshToken: resp.data.tokens.refreshToken,
          user: resp.data.user
        });
        setStatus("Connexion reussie.");
        setStatusType("success");
        setTimeout(() => router.push(nextPath), 500);
        return;
      }

      if (resetToken.trim()) {
        const resp = await api.post("/auth/password/reset", {
          token: resetToken.trim(),
          newPassword: password
        });
        storeSession({
          accessToken: resp.data.tokens.accessToken,
          refreshToken: resp.data.tokens.refreshToken,
          user: resp.data.user
        });
        setStatus("Mot de passe reinitialise. Connexion reussie.");
        setStatusType("success");
        setTimeout(() => router.push(nextPath), 500);
        return;
      }

      const resp = await api.post("/auth/password/request-reset", {
        email: email.trim()
      });
      const token = resp.data?.token as string | undefined;
      setStatus(
        token
          ? `Token de reset (dev): ${token}`
          : "Si un compte existe, un email de reinitialisation a ete envoye."
      );
      setStatusType("success");
    } catch (error: unknown) {
      const e = error as { message?: string; response?: { data?: { message?: string } } };
      setStatus(e?.response?.data?.message ?? e?.message ?? "Erreur.");
      setStatusType("error");
    } finally {
      setSubmittingEmail(false);
    }
  };

  const emailTrimmed = email.trim();
  const passwordOk = password.length >= 8;
  const confirmOk = authMode !== "register" || password === confirmPassword;
  const canSubmitEmail =
    authMode === "login"
      ? Boolean(emailTrimmed) && Boolean(password)
      : authMode === "register"
        ? Boolean(emailTrimmed) && passwordOk && confirmOk
        : Boolean(emailTrimmed);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center px-4 py-10">
      <div className="grid w-full gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="glass neon-border rounded-3xl p-8">
            <div className="flex items-center gap-3">
              <SololaThemedLogo width={54} height={54} className="rounded-2xl" priority sizes="54px" />
              <div>
                <h1 className="font-heading text-4xl font-bold text-white">Solola</h1>
                <p className="mt-1 text-sm text-slate-300">Connecte-toi pour partager, publier et discuter.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Stories</p>
                <p className="mt-2 text-sm text-slate-200">Publie des photos et vidéos qui expirent.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Reels</p>
                <p className="mt-2 text-sm text-slate-200">Partage des vidéos courtes, likes et commentaires.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Messages & Canaux</p>
                <p className="mt-2 text-sm text-slate-200">Discute et diffuse dans tes canaux (texte + médias).</p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full animate-slide-up">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-4 text-center lg:hidden">
              <div className="mx-auto mb-3 flex w-full justify-center">
                <SololaThemedLogo width={64} height={64} className="rounded-2xl" priority sizes="64px" />
              </div>
              <h1 className="font-heading text-4xl font-bold text-white">Solola</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">Connecte-toi pour continuer.</p>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#10172b]">
                    {authMode === "login" ? "Connexion" : authMode === "register" ? "Inscription" : "Mot de passe"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {authMode === "login"
                      ? "Entre tes identifiants pour te connecter."
                      : authMode === "register"
                        ? "Crée ton compte en quelques secondes."
                        : "Demande ou applique un reset de mot de passe."}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <SololaThemedLogo width={34} height={34} className="rounded-xl" priority sizes="34px" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setStatus("");
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    authMode === "login" ? "bg-[#10172b] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setStatus("");
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    authMode === "register" ? "bg-[#10172b] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  S’inscrire
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab("email");
                    setStatus("");
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    tab === "email" ? "border border-slate-200 bg-white text-[#10172b]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("phone");
                    setStatus("");
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    tab === "phone" ? "border border-slate-200 bg-white text-[#10172b]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Téléphone
                </button>
              </div>

              <div className="mt-4 space-y-3">

          {tab === "phone" ? (
            <>
              {!apiConfigured ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Configuration API manquante : definissez NEXT_PUBLIC_API_URL (ex:
                  https://solola-api.onrender.com/api), puis redeployez le frontend.
                </div>
              ) : null}
              {!FIREBASE_CONFIGURED ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Configuration Firebase manquante : definissez NEXT_PUBLIC_FIREBASE_API_KEY,
                  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID et
                  NEXT_PUBLIC_FIREBASE_APP_ID dans le fichier .env a la racine du projet, puis
                  redemarrez le serveur de developpement.
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                  Numero telephone
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(formatPhoneInput(e.target.value))
                  }
                  className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
                  placeholder="+243..."
                  autoComplete="tel"
                  disabled={sending || verifying}
                  type="tel"
                />
              </div>

              <button
                onClick={() => void sendCode()}
                disabled={sending || verifying}
                className="btn-neon w-full rounded-2xl py-3.5 text-sm font-bold tracking-wide disabled:opacity-60"
              >
                {sending ? "Envoi du code..." : "Envoyer le code"}
              </button>

              {confirmationResult && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                      Code OTP
                    </label>
                    <input
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm font-mono text-center text-lg tracking-widest"
                      placeholder="000000"
                      inputMode="numeric"
                      disabled={verifying}
                    />
                  </div>

                  <button
                    onClick={() => void verifyCode()}
                    disabled={sending || verifying}
                    className="btn-outline-neon w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-60"
                  >
                    {verifying ? "Verification..." : "Verifier puis se connecter"}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {!apiConfigured ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Configuration API manquante : definissez NEXT_PUBLIC_API_URL (ex:
                  https://solola-api.onrender.com/api), puis redeployez le frontend.
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  className="btn-outline-neon w-full rounded-2xl py-3 text-sm font-semibold opacity-60"
                  title="Bientôt disponible"
                >
                  Continuer avec Google
                </button>
                <button
                  type="button"
                  disabled
                  className="btn-outline-neon w-full rounded-2xl py-3 text-sm font-semibold opacity-60"
                  title="Bientôt disponible"
                >
                  Continuer avec Apple
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("phone");
                    setStatus("");
                  }}
                  className="btn-outline-neon w-full rounded-2xl py-3 text-sm font-semibold"
                >
                  Continuer avec téléphone (OTP)
                </button>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {authMode === "register" ? (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#10172b] placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgba(76,111,255,0.25)]"
                  placeholder="Nom (optionnel)"
                />
              ) : null}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#10172b] placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgba(76,111,255,0.25)]"
                placeholder="Téléphone, nom d'utilisateur ou email"
                inputMode="email"
                autoComplete="email"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#10172b] placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgba(76,111,255,0.25)]"
                placeholder={authMode === "reset" && resetToken.trim() ? "Nouveau mot de passe" : "Mot de passe"}
                type="password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />

              {authMode === "register" ? (
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#10172b] placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgba(76,111,255,0.25)]"
                  placeholder="Confirmer le mot de passe (8 caractères min)"
                  type="password"
                  autoComplete="new-password"
                />
              ) : null}

              {authMode === "reset" ? (
                <input
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#10172b] placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgba(76,111,255,0.25)]"
                  placeholder="Token reset (laisser vide pour le demander)"
                />
              ) : null}

              <button
                type="button"
                onClick={() => void submitEmailAuth()}
                disabled={submittingEmail || !canSubmitEmail}
                className="w-full rounded-xl bg-[#4c6fff] py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(76,111,255,0.25)] transition hover:brightness-110 disabled:opacity-50"
              >
                {submittingEmail
                  ? "Veuillez patienter..."
                  : authMode === "login"
                    ? "Se connecter"
                    : authMode === "register"
                      ? "S’inscrire"
                      : resetToken.trim()
                        ? "Changer le mot de passe"
                        : "Demander le reset"}
              </button>

              {authMode === "register" ? (
                <p className="pt-1 text-[11px] leading-relaxed text-slate-600">
                  En t’inscrivant, tu acceptes nos{" "}
                  <Link className="text-slate-900 underline underline-offset-2" href="/legal/terms">
                    conditions
                  </Link>{" "}
                  et notre{" "}
                  <Link className="text-slate-900 underline underline-offset-2" href="/legal/privacy">
                    politique de confidentialité
                  </Link>
                  .
                </p>
              ) : null}
            </>
          )}

          {status && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                statusType === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {status}
            </div>
          )}

          <div id="recaptcha-container" style={{ display: "none" }} />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("reset");
                    setStatus("");
                  }}
                  className="text-slate-600 hover:text-slate-900 underline underline-offset-2"
                >
                  Mot de passe oublié ?
                </button>
                <Link href="/legal/privacy" className="text-slate-500 hover:text-slate-800 underline underline-offset-2">
                  Confidentialité
                </Link>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-white/10 bg-black/20 p-4 text-center text-sm text-slate-200">
              {authMode === "login" ? (
                <>
                  Pas de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setStatus("");
                    }}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    Inscris-toi
                  </button>
                </>
              ) : (
                <>
                  Tu as déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setStatus("");
                    }}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    Connecte-toi
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
