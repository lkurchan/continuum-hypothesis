import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-20">
      <h1 className="text-4xl font-semibold">Continuum</h1>
      <p>Tu trabajo se cobra segundo a segundo, en pesos onchain.</p>
      <nav aria-label="Vistas demo" className="flex gap-6">
        <Link href="/payer" className="underline">Soy pagador</Link>
        <Link href="/worker" className="underline">Soy trabajador</Link>
      </nav>
    </main>
  );
}
