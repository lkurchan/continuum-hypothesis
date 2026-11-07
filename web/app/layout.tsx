import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Continuum",
  description: "Pagos por segundo en pesos onchain con ARGt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
