import { SectionHeader } from "../../components/SectionHeader";

const notifications = [
  "Vous avez un nouveau like",
  "Votre abonnement premium expire dans 3 jours",
  "Nouveau message recu"
];

export default function NotificationsPage() {
  return (
    <section>
      <SectionHeader title="Notifications" subtitle="Temps reel, activite et alertes" />
      <div className="space-y-3">
        {notifications.map((item) => (
          <article key={item} className="glass rounded-2xl p-4 text-sm text-slate-200">
            {item}
          </article>
        ))}
      </div>
    </section>
  );
}
