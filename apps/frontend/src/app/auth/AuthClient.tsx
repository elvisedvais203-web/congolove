"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { auth, firebaseConfigured } from "../../firebase";
import api from "../../lib/api";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

function formatPhoneInput(value: string) {
  if (!value.startsWith("+")) {
    return `+${value.replace(/[^\d]/g, "")}`;
  }
  return `+${value.slice(1).replace(/[^\d]/g, "")}`;
}

function isLikelyE164(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

function normalizeError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid-phone-number")) {
    return "Numero invalide. Format attendu: +243...";
  }
  if (text.includes("too-many-requests")) {
    return "Trop de tentatives. Reessayez plus tard.";
  }
  if (text.includes("billing-not-enabled") || text.includes("auth/billing-not-enabled")) {
    return "La facturation Firebase n'est pas active pour ce projet. Activez Google Cloud Billing puis reessayez, ou utilisez des numeros de test Firebase en developpement.";
  }
  if (text.includes("invalid-verification-code")) {
    return "Code invalide. Veuillez verifier le SMS.";
  }
  if (text.includes("session-expired") || text.includes("code-expired")) {
    return "Code expire. Demandez un nouveau code.";
  }
  if (text.includes("unauthorized-domain") || text.includes("unauthorized_domain")) {
    return "Ce domaine n'est pas autorise sur Firebase. Contactez le support.";
  }
  if (text.includes("captcha-check-failed") || text.includes("recaptcha")) {
    return "Verification anti-robot echouee. Rechargez la page et reessayez.";
  }
  if (text.includes("network-request-failed") || text.includes("network")) {
    return "Connexion reseau echouee. Verifiez votre acces Internet.";
  }
  if (text.includes("invalid-app-credential") || text.includes("app credential")) {
    return "Verification anti-robot invalide. Rechargez la page et redemandez un code.";
  }
  if (text.includes("quota") || text.includes("sms")) {
    return "Envoi SMS limite temporairement. Reessayez plus tard ou utilisez un numero de test Firebase.";
  }
  if (text.includes("session firebase invalide") || text.includes("token firebase")) {
    return "Session Firebase invalide ou expiree. Redemandez un code OTP.";
  }
  if (text.includes("configuration firebase admin manquante") || text.includes("firebase_service_account_json invalide")) {
    return "Configuration serveur Firebase invalide. Contactez le support.";
  }
  if (text.includes("compte suspendu")) {
    return "Compte suspendu. Contactez le support.";
  }
  if (text.includes("compte est banni")) {
    return "Ce compte est banni. Contactez le support.";
  }
  return "Une erreur est survenue. Veuillez reessayer.";
}

function extractErrorText(error: any) {
  const apiMessage = error?.response?.data?.message;
  const firebaseCode = error?.code;
  const rawMessage = error?.message;
  const parts = [apiMessage, firebaseCode, rawMessage]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => String(value));
  return parts.join(" | ");
}

export default function AuthClient() {
  const router = useRouter();
  const disableAppVerificationForTestingRequested =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DISABLE_APP_VERIFICATION === "true";
  const disableAppVerificationForTesting =
    disableAppVerificationForTestingRequested &&
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const [phoneNumber, setPhoneNumber] = useState("+243");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success">("success");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  function initRecaptcha() {
    if (!auth) return;
    if (window.recaptchaVerifier) {
      return;
    }
    auth.languageCode = "fr";
    const recaptchaSize = disableAppVerificationForTesting ? "normal" : "invisible";
    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: recaptchaSize,
      callback: () => {},
      "expired-callback": () => {
        window.recaptchaVerifier = undefined;
      }
    });
    verifier.render().catch(() => {});
    window.recaptchaVerifier = verifier;
  }

  useEffect(() => {
    if (auth && disableAppVerificationForTesting) {
      auth.settings.appVerificationDisabledForTesting = true;
    }
    initRecaptcha();

    return () => {
      try {
        window.recaptchaVerifier?.clear();
      } catch {
        // ignore clear errors
      }
      window.recaptchaVerifier = undefined;
    };
  }, [disableAppVerificationForTesting]);

  const sendCode = async () => {
    if (!auth) {
      setStatus("Authentification Firebase indisponible sur ce client.");
      setStatusType("error");
      return;
    }

    if (!window.recaptchaVerifier) {
      setStatus("reCAPTCHA non initialise. Rechargez la page.");
      setStatusType("error");
      return;
    }

    try {
      setSending(true);
      setStatus("");
      const normalizedPhone = formatPhoneInput(phoneNumber.trim());
      if (!isLikelyE164(normalizedPhone)) {
        setStatus("Numero invalide. Utilisez le format international, par exemple +243... ");
        setStatusType("error");
        return;
      }

      const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStatus(`Code SMS envoye vers ${normalizedPhone}.`);
      setStatusType("success");
    } catch (error: any) {
      const details = extractErrorText(error);
      setStatus(normalizeError(details));
      setStatusType("error");
      console.error("[Auth][sendCode]", error);
      try {
        window.recaptchaVerifier?.clear();
      } catch {
        // ignore clear errors
      }
      window.recaptchaVerifier = undefined;
      setTimeout(() => initRecaptcha(), 300);
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

    const normalizedOtp = otpCode.trim().replace(/\D/g, "");
    if (normalizedOtp.length !== 6) {
      setStatus("Entrez le code OTP a 6 chiffres.");
      setStatusType("error");
      return;
    }

    try {
      setVerifying(true);
      setStatus("");
      const credential = await confirmationResult.confirm(normalizedOtp);
      const idToken = await credential.user.getIdToken(true);
      const backend = await api.post("/auth/firebase/verify", {
        idToken,
        displayName: credential.user.displayName ?? undefined
      });

      localStorage.setItem("accessToken", backend.data.tokens.accessToken);
      localStorage.setItem("refreshToken", backend.data.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(backend.data.user));

      setStatus("Connexion reussie.");
      setStatusType("success");
      router.push("/dashboard");
    } catch (error: any) {
      const details = extractErrorText(error);
      setStatus(normalizeError(details));
      setStatusType("error");
      console.error("[Auth][verifyCode]", error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-8">
      <section className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold text-white">Connexion securisee</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Entrez votre numero pour recevoir un code SMS.</p>
        </div>

        {!firebaseConfigured ? (
          <div className="glass rounded-4xl p-8 neon-border space-y-4 text-center">
            <p className="text-base font-semibold text-[#ff4d4f]">Firebase non configure</p>
            <p className="text-sm text-slate-400">
              Ajoutez les variables <code className="text-neoblue">NEXT_PUBLIC_FIREBASE_*</code> dans{" "}
              <code className="text-neoblue">apps/frontend/.env.local</code> pour activer la connexion par SMS.
            </p>
          </div>
        ) : (
        <div className="glass rounded-4xl p-8 neon-border space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Numero telephone</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhoneInput(e.target.value))}
              className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
              placeholder="+243..."
              autoComplete="tel"
              disabled={sending || verifying}
            />
          </div>

          <button
            onClick={() => void sendCode()}
            disabled={sending || verifying}
            className="btn-neon w-full rounded-2xl py-3.5 text-sm font-bold tracking-wide disabled:opacity-60"
          >
            {sending ? "Envoi du code..." : "Envoyer code"}
          </button>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Code OTP</label>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input-neon w-full rounded-2xl px-4 py-3.5 text-sm"
              placeholder="6 chiffres"
              inputMode="numeric"
              disabled={verifying}
            />
          </div>

          <button
            onClick={() => void verifyCode()}
            disabled={sending || verifying || !confirmationResult}
            className="btn-outline-neon w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-60"
          >
            {verifying ? "Verification..." : "Verifier et se connecter"}
          </button>

          {status && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${statusType === "success"
              ? "border border-[#39ff14]/30 bg-[#39ff14]/10 text-[#39ff14]"
              : "border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f]"}`}>
              {status}
            </div>
          )}

          <div id="recaptcha-container" className="flex justify-center" />
        </div>
        )}
      </section>
    </div>
  );
}
