type SectionHeaderProps = {
  title: string;
  subtitle: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <header className="mb-5">
      <h1 className="font-heading text-3xl tracking-tight text-white">{title}</h1>
      <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
    </header>
  );
}
