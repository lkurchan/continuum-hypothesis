import Link from "next/link";

export default function WorkerPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-20">
      <Link href="/" className="underline">Volver al inicio</Link>
      <h1 className="text-3xl font-semibold">Trabajador</h1>
      <p>El panel para consultar y retirar tus pagos está en preparación.</p>
    </main>
  );
}
