import Link from "next/link";

export default function PayerPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-20">
      <Link href="/" className="underline">Volver al inicio</Link>
      <h1 className="text-3xl font-semibold">Pagador</h1>
      <p>El panel para crear y administrar pagos está en preparación.</p>
    </main>
  );
}
