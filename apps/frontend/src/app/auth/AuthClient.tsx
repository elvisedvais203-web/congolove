"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { auth } from "../../firebase";
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

function normalizeError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid-phone-number")) {
    return "Numero invalide. Format attendu: +243...";
  }
  if (text.includes("too-many-requests")) {
    return "Trop de tentatives. Reessayez plus tard.";
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
  return "Une erreur est survenue. Veuillez reessayer.";
}

export default function AuthClient() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("+243");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success">("success");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  function initRecaptcha() {
    if (window.recaptchaVerifier) {
      return;
    }
    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        window.recaptchaVerifier = undefined;
      }
    });
    verifier.render().catch(() => {});
    window.recaptchaVerifier = verifier;
  }

  useEffect(() => {
    initRecaptcha();
  }, []);

  const sendCode = async () => {
    if (!window.recaptchaVerifier) {
      setStatus("reCAPTCHA non initialise. Rechargez la page.");
      setStatusType("error");
      return;
    }

    try {
      setSending(true);
      setStatus("");
      const normalizedPhone = formatPhoneInput(phoneNumber.trim());
      const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStatus(`Code SMS envoye vers ${normalizedPhone}.`);
      setStatusType("success");
    } catch (error: any) {
      setStatus(normalizeError(String(error?.message ?? error?.code ?? "")));
      setStatusType("error");
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

      localStorage.setItem("accessToken", backend.data.tokens.accessToken);
      localStorage.setItem("refreshToken", backend.data.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(backend.data.user));

      setStatus("Connexion reussie.");
      setStatusType("success");
      router.push("/dashboard");
    } catch (error: any) {
      setStatus(normalizeError(String(error?.message ?? error?.response?.data?.message ?? "")));
      setStatusType("error");
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
      </section>
    </div>
  );
}
