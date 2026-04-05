import { SectionHeader } from "../../components/SectionHeader";

export default function LikesPage() {
  return (
    <section>
      <SectionHeader title="Likes recus" subtitle="Voir qui s interesse a vous" />
      <div className="glass rounded-2xl p-5">
        <p className="text-slate-300">Activez Premium pour voir la liste complete des personnes qui vous ont like.</p>
      </div>
    </section>
  );
}
