"use client";

import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { getMyPushTokens, subscribePushToken } from "../../services/notifications";

const notifications = [
  { type: "LIKE", text: "Vous avez recu 2 nouveaux likes", time: "Il y a 5 min" },
  { type: "MESSAGE", text: "Nouveau message de Amina", time: "Il y a 12 min" },
  { type: "MATCH", text: "C'est un match avec Patrick", time: "Il y a 28 min" },
  { type: "SECURITY", text: "Votre verification d'identite est en attente", time: "Aujourd'hui" }
];

export default function NotificationsPage() {
  const [pushStatus, setPushStatus] = useState("");

  const activatePush = async () => {
    try {
      if (!("Notification" in window)) {
        setPushStatus("Notifications non supportees sur ce navigateur.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("Permission notifications refusee.");
        return;
      }

      const pseudoToken = `web_${navigator.userAgent.slice(0, 30)}_${Date.now()}`;
      await subscribePushToken(pseudoToken);
      const data = await getMyPushTokens();
      setPushStatus(`Notifications activees (${data.count} token(s) enregistre(s)).`);
    } catch {
      setPushStatus("Impossible d'activer les notifications push.");
    }
  };

  return (
    <section>
      <SectionHeader title="Notifications" subtitle="Likes, messages, matchs et alertes securite" />
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => void activatePush()} className="btn-outline-neon rounded-xl px-3 py-2 text-xs">
          Activer push web
        </button>
        {pushStatus && <p className="text-xs text-slate-300">{pushStatus}</p>}
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {[
          "Tout",
          "Likes",
          "Messages",
          "Matchs"
        ].map((chip) => (
          <span key={chip} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-slate-300">
            {chip}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {notifications.map((item) => (
          <article key={`${item.type}-${item.text}`} className="glass rounded-2xl p-4 text-sm text-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-neoblue">{item.type}</p>
                <p className="mt-1">{item.text}</p>
              </div>
              <span className="text-xs text-slate-400">{item.time}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
