"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeader } from "../../components/SectionHeader";
import api from "../../lib/api";
import { fetchCsrfToken } from "../../services/security";
import { AuthGuard } from "../../components/AuthGuard";
import { logoutSession } from "../../lib/session";

export default function SettingsPage() {
  const router = useRouter();
  const [dataSaver, setDataSaver] = useState(false);
  const [invisibleMode, setInvisibleMode] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get("/profile/me")
      .then((res) => {
        setDataSaver(Boolean(res.data?.user?.dataSaverEnabled));
        setInvisibleMode(Boolean(res.data?.user?.invisibleMode));
      })
      .catch(() => {
        setDataSaver(false);
        setInvisibleMode(false);
      });
  }, []);

  const save = async () => {
    try {
      const csrf = await fetchCsrfToken();
      await api.patch(
        "/profile/me",
        {
          dataSaverEnabled: dataSaver,
          invisibleMode
        },
        {
          headers: { "x-csrf-token": csrf }
        }
      );
      setStatus("Parametres enregistres");
    } catch {
      setStatus("Echec d'enregistrement des parametres. Veuillez reessayer.");
    }
  };

  const logout = () => {
    logoutSession();
    router.replace("/auth");
  };

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Parametres" subtitle="Optimisation 3G, confidentialite et securite" />
        <div className="glass rounded-3xl p-5">
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span>Activer economie de donnees</span>
              <input
                type="checkbox"
                checked={dataSaver}
                onChange={(e) => setDataSaver(e.target.checked)}
                className="h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span>Mode invisible</span>
              <input
                type="checkbox"
                checked={invisibleMode}
                onChange={(e) => setInvisibleMode(e.target.checked)}
                className="h-5 w-5"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
              Enregistrer
            </button>
            <button onClick={logout} className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-200">
              Se deconnecter
            </button>
          </div>
          <p className="mt-2 text-sm text-gold">{status}</p>
        </div>
      </section>
    </AuthGuard>
  );
}
