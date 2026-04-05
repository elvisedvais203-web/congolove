import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-md py-20 text-center">
      <h1 className="font-heading text-4xl text-white">Page introuvable</h1>
      <p className="mt-2 text-slate-300">Retournez a l accueil pour continuer.</p>
      <Link href="/" className="mt-5 inline-block rounded-xl bg-neoblue px-4 py-2 font-semibold text-[#041127]">
        Aller a l accueil
      </Link>
    </section>
  );
}
