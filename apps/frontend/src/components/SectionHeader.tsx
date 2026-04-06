type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  accent?: "blue" | "violet" | "pink" | "gold";
};

const accentMap = {
  blue: "neon-text",
  violet: "neon-text-violet",
  pink: "neon-text-pink",
  gold: "neon-text-gold"
};

export function SectionHeader({ title, subtitle, accent = "blue" }: SectionHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <span className={`h-7 w-1 rounded-full bg-gradient-neon shadow-neon`} />
        <h1 className={`font-heading text-3xl tracking-tight text-white`}>{title}</h1>
      </div>
      {subtitle && <p className={`mt-1.5 text-sm pl-4 ${accentMap[accent]} opacity-80`}>{subtitle}</p>}
    </header>
  );
}
