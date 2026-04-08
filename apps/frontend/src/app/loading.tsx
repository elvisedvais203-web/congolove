export default function GlobalLoadingPage() {
  return (
    <section className="mx-auto mt-10 max-w-2xl">
      <div className="glass rounded-3xl p-6 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Chargement</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-neoblue" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-neoviolet [animation-delay:120ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold [animation-delay:240ms]" />
        </div>
      </div>
    </section>
  );
}
