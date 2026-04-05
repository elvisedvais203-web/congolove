"use client";

import Link from "next/link";
import { useState } from "react";
import api from "../../../lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [identifierForOtp, setIdentifierForOtp] = useState("");
  const [step, setStep] = useState<"register" | "verify" | "done">("register");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const submit = async () => {
    try {
      setLoading(true);
      await api.post("/auth/register", { phone, email, password });
      const identifier = (email.trim() || phone.trim()).toLowerCase();
      setIdentifierForOtp(identifier);
      setStep("verify");
      setStatus("Compte cree. Un code OTP vient d'etre envoye par SMS/email.");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Inscription echouee.");
    } finally {
      setLoading(false);
    }
  };

  const verifyIdentity = async () => {
    try {
      setLoading(true);
      await api.post("/auth/otp/verify", { identifier: identifierForOtp, code: otpCode });
      setStep("done");
      setStatus("Identite confirmee. Vous pouvez maintenant vous connecter.");
      router.push(`/auth?identifier=${encodeURIComponent(identifierForOtp)}`);
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Verification OTP echouee.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setLoading(true);
      await api.post("/auth/otp/send", { identifier: identifierForOtp });
      setStatus("Nouveau code OTP envoye.");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Impossible de renvoyer le code OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md glass rounded-3xl p-6">
      <h1 className="font-heading text-3xl">Inscription</h1>
      {step === "register" && (
        <div className="mt-6 space-y-3">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Numero RDC +243..." />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Mot de passe" />
          <button onClick={submit} disabled={loading} className="w-full rounded-xl bg-neoblue px-4 py-3 font-semibold text-[#041127] disabled:opacity-60">
            {loading ? "Creation..." : "Creer mon compte"}
          </button>
        </div>
      )}

      {step === "verify" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-300">Entrez le code recu par SMS/email pour confirmer votre identite.</p>
          <input value={identifierForOtp} onChange={(e) => setIdentifierForOtp(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Email ou numero" />
          <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Code OTP" />
          <button onClick={verifyIdentity} disabled={loading} className="w-full rounded-xl bg-neoblue px-4 py-3 font-semibold text-[#041127] disabled:opacity-60">
            {loading ? "Verification..." : "Confirmer mon identite"}
          </button>
          <button onClick={resendOtp} disabled={loading} className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 font-semibold text-white disabled:opacity-60">
            Renvoyer le code
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 space-y-3">
          <Link href="/auth" className="block w-full rounded-xl bg-neoblue px-4 py-3 text-center font-semibold text-[#041127]">
            Aller a la connexion
          </Link>
        </div>
      )}
      <p className="mt-3 text-sm text-gold">{status}</p>
    </section>
  );
}
