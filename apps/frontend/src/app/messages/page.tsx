import { AuthGuard } from "../../components/AuthGuard";
import { SectionHeader } from "../../components/SectionHeader";
import { UltraTelegramChat } from "../../components/UltraTelegramChat";

export default function MessagesPage() {
  return (
    <AuthGuard>
      <section className="space-y-4 animate-fade-in">
        <SectionHeader title="Messages" subtitle="Vos conversations en temps reel" accent="blue" />
        <div className="glass neon-border rounded-3xl p-3">
          <UltraTelegramChat />
        </div>
      </section>
    </AuthGuard>
  );
}
