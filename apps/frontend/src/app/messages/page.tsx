import { AuthGuard } from "../../components/nextalkauthguard";
import { SectionHeader } from "../../components/nextalksectionheader";
import dynamic from "next/dynamic";

const NextalkChat = dynamic(
  () => import("../../components/nextalkchat").then((module) => module.NextalkChat),
  {
    loading: () => (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-white/10" />
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    )
  }
);

export default function MessagesPage() {
  return (
    <AuthGuard>
      <section className="space-y-4 animate-fade-in pb-2">
        <SectionHeader title="Messagerie" accent="blue" />
        <div className="glass neon-border rounded-3xl p-3">
          <NextalkChat />
        </div>
      </section>
    </AuthGuard>
  );
}
