"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import api from "../../../lib/api";
import { useRouter } from "next/navigation";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

const countries = getCountries().map((country) => ({
  code: country,
  dialCode: `+${getCountryCallingCode(country)}`
}));

export default function RegisterPage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState("CD");
  const [phonePrefix, setPhonePrefix] = useState("+243");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [identifierForOtp, setIdentifierForOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<"SERIOUS" | "FUN" | "FRIENDSHIP">("SERIOUS");
  const [step, setStep] = useState<"account" | "profile" | "verify" | "done">("account");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const phone = useMemo(() => `${phonePrefix}${phoneLocal}`.replace(/\s+/g, ""), [phonePrefix, phoneLocal]);
  const canContinueAccount = useMemo(() => phonePrefix.trim().startsWith("+") && phoneLocal.trim().length >= 4 && password.trim().length >= 6, [phonePrefix, phoneLocal, password]);

  const popularInterests = ["musique", "voyage", "sport", "cine", "mode", "startup", "lecture", "food", "tech"];

  const toggleInterest = (tag: string) => {
    setInterests((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      return [...prev, tag].slice(0, 8);
    });
  };

  const submit = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/auth/register", { phone, email, password });
      const identifier = (email.trim() || phone.trim()).toLowerCase();
      setIdentifierForOtp(identifier);
      if (data?.otp?.debugCode) {
        setOtpCode(String(data.otp.debugCode));
      }

      localStorage.setItem(
        "kl_ai_bootstrap",
        JSON.stringify({
          displayName,
          city,
          interests,
          lookingFor,
          contentModes: ["PEOPLE", "PHOTO", "VIDEO"]
        })
      );

      setStep("verify");
      setStatus(data?.otp?.debugCode ? `Compte cree. OTP dev: ${data.otp.debugCode}` : "Compte cree. Un code OTP vient d'etre envoye. Vos preferences IA sont pretes.");
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
      const { data } = await api.post("/auth/otp/send", { identifier: identifierForOtp });
      if (data?.debugCode) {
        setOtpCode(String(data.debugCode));
      }
      setStatus(data?.debugCode ? `Nouveau code OTP dev: ${data.debugCode}` : "Nouveau code OTP envoye.");
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Impossible de renvoyer le code OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md glass rounded-3xl p-6">
      <h1 className="font-heading text-3xl">Creer votre compte</h1>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neoblue">
        {step === "account" ? "Etape 1/3" : step === "profile" ? "Etape 2/3" : step === "verify" ? "Etape 3/3" : "Termine"}
      </p>

      {step === "account" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-300">Infos de base pour commencer.</p>
          <div className="grid grid-cols-[1fr_110px_1fr] gap-2">
            <select
              aria-label="Pays du numero"
              value={selectedCountry}
              onChange={(e) => {
                const country = e.target.value;
                setSelectedCountry(country);
                const found = countries.find((item) => item.code === country);
                if (found) {
                  setPhonePrefix(found.dialCode);
                }
              }}
              className="rounded-xl border border-white/20 bg-black/30 px-3 py-3"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.code} ({country.dialCode})
                </option>
              ))}
            </select>
            <input
              value={phonePrefix}
              onChange={(e) => setPhonePrefix(e.target.value)}
              className="rounded-xl border border-white/20 bg-black/30 px-3 py-3"
              placeholder="+243"
            />
            <input
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value.replace(/[^\d]/g, ""))}
              className="rounded-xl border border-white/20 bg-black/30 px-3 py-3"
              placeholder="Numero"
            />
          </div>
          <p className="text-xs text-slate-400">Saisissez le prefixe pays (ex: +243, +33, +1) puis le numero.</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Mot de passe" />
          <button onClick={() => setStep("profile")} disabled={!canContinueAccount} className="w-full rounded-xl bg-neoblue px-4 py-3 font-semibold text-[#041127] disabled:opacity-60">
            Continuer
          </button>
        </div>
      )}

      {step === "profile" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-300">Personnalisez votre experience comme sur les grandes apps de rencontre.</p>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Pseudo" />
          <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3" placeholder="Ville (Kinshasa, Goma...)" />

          <div>
            <p className="mb-2 text-sm text-slate-300">Ce que vous cherchez:</p>
            <div className="flex gap-2">
              {[
                { key: "SERIOUS", label: "Serieux" },
                { key: "FUN", label: "Fun" },
                { key: "FRIENDSHIP", label: "Amitie" }
              ].map((option) => {
                const active = lookingFor === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => setLookingFor(option.key as "SERIOUS" | "FUN" | "FRIENDSHIP")}
                    className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-neoblue/25 text-neoblue" : "bg-white/5 text-slate-300"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-300">Centres d'interet:</p>
            <div className="flex flex-wrap gap-2">
              {popularInterests.map((tag) => {
                const active = interests.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      active ? "border-neoblue bg-neoblue/20 text-neoblue" : "border-white/15 bg-white/5 text-slate-300"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setStep("account")} className="rounded-xl border border-white/20 bg-black/20 px-4 py-3 font-semibold text-white">
              Retour
            </button>
            <button onClick={submit} disabled={loading} className="rounded-xl bg-neoblue px-4 py-3 font-semibold text-[#041127] disabled:opacity-60">
              {loading ? "Creation..." : "Creer + Continuer"}
            </button>
          </div>
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
