"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { AuthGuard } from "../../components/AuthGuard";
import { getConversations } from "../../services/chat";

type MatchRow = {
  id: string;
  title: string;
  city?: string;
  online: boolean;
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const conversations = await getConversations();
        const privateMatches = conversations
          .filter((conversation) => conversation.kind === "PRIVATE")
          .map((conversation) => ({
            id: conversation.id,
            title: conversation.title,
            city: conversation.members.find((member) => member.displayName === conversation.title)?.city,
            online: conversation.online
          }));

        setMatches(privateMatches);
      } catch {
        setStatus("Impossible de charger les matchs pour le moment.");
      }
    })();
  }, []);

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Mes matchs" subtitle="Vos connexions mutuelles" />
        <div className="grid gap-3 md:grid-cols-3">
          {matches.map((match) => (
            <article key={match.id} className="glass rounded-2xl p-4">
              <p className="font-heading text-xl">{match.title}</p>
              <p className="mt-1 text-sm text-slate-300">{match.city ?? "RDC"}</p>
              <p className="mt-1 text-xs text-slate-400">{match.online ? "En ligne" : "Hors ligne"}</p>
            </article>
          ))}
        </div>
        {!matches.length && <p className="mt-3 text-sm text-slate-300">Aucun match pour le moment.</p>}
        {status && <p className="mt-3 text-sm text-gold">{status}</p>}
      </section>
    </AuthGuard>
  );
}
