import { PayerHeader } from "@/components/payer/PayerHeader";
import { PayerProvider } from "@/components/payer/PayerContext";

export default function PayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PayerProvider>
      <div className="min-h-dvh bg-page">
        <PayerHeader />
        <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-8">{children}</main>
      </div>
    </PayerProvider>
  );
}
