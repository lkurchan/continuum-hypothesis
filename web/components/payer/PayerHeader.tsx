"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, NetworkChip } from "@/components/ui/kit";
import { initials } from "@/components/ui/format";
import { usePayer } from "./PayerContext";

const links = [
  { href: "/payer", label: "Panel" },
  { href: "/payer/nuevo", label: "Nuevo pago" },
];

export function PayerHeader() {
  const path = usePathname();
  const { user } = usePayer();
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6">
        <Logo size={26} />
        <nav aria-label="Secciones" className="flex gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${path === l.href ? "bg-surface text-ink" : "text-muted hover:text-ink"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline-flex"><NetworkChip /></span>
          <Link href="/" aria-label="Cambiar de usuario" title={user?.name}
            className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {user ? initials(user.name) : ""}
          </Link>
        </div>
      </div>
    </header>
  );
}
