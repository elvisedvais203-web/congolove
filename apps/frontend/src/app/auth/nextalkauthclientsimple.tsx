"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPhoneNumber,
  ApplicationVerifier,
  RecaptchaVerifier
} from "firebase/auth";
import { auth } from "../../nextalkfirebase";
import api from "../../lib/nextalkapi";
import { storeSession } from "../../lib/nextalksession";

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
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");

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
        router.push("/dashboard");
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
        setTimeout(() => router.push("/dashboard"), 500);
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
        setTimeout(() => router.push("/dashboard"), 500);
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
        setTimeout(() => router.push("/dashboard"), 500);
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

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-8">
      <section className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold text-white">
            Connexion securisee
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Connectez-vous avec Telephone (OTP) ou Email.
          </p>
        </div>

        <div className="glass rounded-4xl p-8 neon-border space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTab("phone");
                setStatus("");
              }}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold ${tab === "phone" ? "btn-neon" : "btn-outline-neon"}`}
            >
              Telephone
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("email");
                setStatus("");
              }}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold ${tab === "email" ? "btn-neon" : "btn-outline-neon"}`}
            >
              Email
            </button>
          </div>

          {tab === "phone" ? (
            <>
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`rounded-full px-3 py-1.5 text-xs ${authMode === "login" ? "btn-neon" : "btn-outline-neon"}`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`rounded-full px-3 py-1.5 text-xs ${authMode === "register" ? "btn-neon" : "btn-outline-neon"}`}
                >
                  Inscription
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("reset")}
                  className={`rounded-full px-3 py-1.5 text-xs ${authMode === "reset" ? "btn-neon" : "btn-outline-neon"}`}
                >
                  Reset
                </button>
              </div>

              {authMode === "register" ? (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
                  placeholder="Nom affiche (optionnel)"
                />
              ) : null}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
                placeholder="vous@email.com"
                inputMode="email"
                autoComplete="email"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
                placeholder={authMode === "reset" && resetToken.trim() ? "Nouveau mot de passe" : "Mot de passe"}
                type="password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />

              {authMode === "register" ? (
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
                  placeholder="Confirmer le mot de passe"
                  type="password"
                  autoComplete="new-password"
                />
              ) : null}

              {authMode === "reset" ? (
                <input
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
                  placeholder="Token reset (laisser vide pour le demander)"
                />
              ) : null}

              <button
                type="button"
                onClick={() => void submitEmailAuth()}
                disabled={submittingEmail}
                className="btn-neon w-full rounded-2xl py-3.5 text-sm font-bold tracking-wide disabled:opacity-60"
              >
                {submittingEmail
                  ? "Veuillez patienter..."
                  : authMode === "login"
                    ? "Se connecter"
                    : authMode === "register"
                      ? "Creer un compte"
                      : resetToken.trim()
                        ? "Changer le mot de passe"
                        : "Demander le reset"}
              </button>
            </>
          )}

          {status && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                statusType === "success"
                  ? "border border-[#39ff14]/30 bg-[#39ff14]/10 text-[#39ff14]"
                  : "border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f]"
              }`}
            >
              {status}
            </div>
          )}

          <div id="recaptcha-container" style={{ display: "none" }} />
        </div>

        <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-xs text-slate-400">
          <summary className="cursor-pointer font-medium text-slate-300">
            Le SMS n arrive pas ? Points a verifier
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              Dans Firebase Console, menu Authentication puis Sign-in method : activer{" "}
              <strong className="text-slate-300">Phone</strong>.
            </li>
            <li>
              Toujours dans Authentication, onglet Settings, Authorized domains : ajouter{" "}
              <strong className="text-slate-300">localhost</strong> (developpement) ou votre domaine.
            </li>
            <li>
              Pour des <strong className="text-slate-300">vrais numeros</strong>, Firebase exige un compte de facturation
              (plan Blaze ou facturation Google Cloud). Sans cela, l erreur{" "}
              <code className="text-slate-300">auth/billing-not-enabled</code> apparait. En dev, vous pouvez utiliser des{" "}
              <strong className="text-slate-300">numeros de test</strong> dans la console Firebase (pas de SMS).
            </li>
            <li>
              Numero au format international <strong className="text-slate-300">+243...</strong>, sans espaces.
            </li>
            <li>Desactiver bloqueurs de pub / extensions qui bloquent reCAPTCHA, puis recharger la page.</li>
          </ul>
        </details>

        <p className="mt-3 text-center text-xs text-[var(--muted)]">
          Si tout est bien configure, le SMS arrive en general en moins d une minute.
        </p>
      </section>
    </div>
  );
}
