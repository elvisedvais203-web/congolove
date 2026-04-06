"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "../../../lib/api";

type Step = "phone" | "code" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!identifier.trim()) return;
    try {
      setLoading(true);
      setStatus("");
      const { data } = await api.post("/auth/forgot-password", { identifier });
      if (data?.debugCode) {
        setCode(String(data.debugCode));
      }
      setStep("code");
      setStatus(data?.debugCode ? `Code OTP dev: ${data.debugCode}` : "Code OTP envoye sur votre numero.");
    } catch (e: any) {
      setStatus(e?.response?.data?.message ?? "Erreur lors de l envoi du code.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!code.trim() || !newPassword.trim()) return;
    try {
      setLoading(true);
      setStatus("");
      await api.post("/auth/reset-password", { identifier, code, newPassword });
      setStatus("Mot de passe reinitialise ! Redirection...");
      setTimeout(() => router.push("/auth"), 2000);
    } catch (e: any) {
      setStatus(e?.response?.data?.message ?? "Code invalide ou expire.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md glass rounded-3xl p-6">
      <h1 className="font-heading text-3xl">Mot de passe oublie</h1>

      {step === "phone" && (
        <>
          <p className="mt-2 text-sm text-slate-300">Un code OTP sera envoye sur votre numero international ou email.</p>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-4 w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3"
            placeholder="Numero +243... ou email"
          />
          <button
            onClick={sendOtp}
            disabled={loading}
            className="mt-3 w-full rounded-xl bg-neoviolet px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Envoi..." : "Envoyer OTP"}
          </button>
        </>
      )}

      {step === "code" && (
        <>
          <p className="mt-2 text-sm text-slate-300">Entrez le code recu, puis votre nouveau mot de passe.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-4 w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3"
            placeholder="Code OTP"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-3 w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3"
            placeholder="Nouveau mot de passe"
          />
          <button
            onClick={resetPassword}
            disabled={loading}
            className="mt-3 w-full rounded-xl bg-neoblue px-4 py-3 font-semibold text-[#041127] disabled:opacity-60"
          >
            {loading ? "Reinitialisation..." : "Reinitialiser le mot de passe"}
          </button>
          <button
            onClick={() => {
              setStep("phone");
              setStatus("");
            }}
            className="mt-2 w-full text-xs text-slate-400 hover:text-slate-200"
          >
            Renvoyer le code
          </button>
        </>
      )}

      <p className="mt-3 text-sm text-gold">{status}</p>
    </section>
  );
}
