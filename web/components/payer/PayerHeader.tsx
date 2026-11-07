"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useThumb } from "@/components/ui/motion";
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
  const ref = useRef<HTMLElement>(null);
  useThumb(ref, links.findIndex((l) => l.href === path));
  return (
    <header style={{ viewTransitionName: "payer-header" }} className="sticky top-0 z-10 border-b border-line bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6">
        <Logo size={26} />
        <nav ref={ref} aria-label="Secciones" className="relative flex gap-1">
          <span data-thumb className="rounded-lg bg-surface" />
          {links.map((l) => (
            <Link key={l.href} href={l.href} data-item transitionTypes={["tab"]} aria-current={path === l.href ? "page" : undefined}
              className={`relative z-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300 ${path === l.href ? "text-ink" : "text-muted hover:text-ink"}`}>
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
