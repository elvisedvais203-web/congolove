import { SololaThemedLogo } from "./sololathemedlogo";

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
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SololaThemedLogo width={24} height={24} className="rounded-md opacity-90" />
            <h1 className="font-heading text-2xl md:text-3xl tracking-tight text-white">{title}</h1>
          </div>
          {subtitle && <p className={`mt-1 text-sm ${accentMap[accent]} opacity-80`}>{subtitle}</p>}
        </div>
        <span className="hidden md:block h-px flex-1 bg-white/10" />
      </div>
    </header>
  );
}
