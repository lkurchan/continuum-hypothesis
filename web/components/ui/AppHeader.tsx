"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { initials } from "./format";
import { Logo, NetworkChip } from "./kit";
import { useThumb } from "./motion";

/** Shared web header for both sides: logo, sliding section tabs, network and identity. */
export function AppHeader({ links, role, name }: { links: { href: string; label: string }[]; role: string; name?: string }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  // The most specific matching section wins (/payer/nuevo over /payer).
  const active = links
    .map((l, i) => ({ i, len: path === l.href || path.startsWith(`${l.href}/`) ? l.href.length : -1 }))
    .reduce((best, cur) => (cur.len > best.len ? cur : best), { i: -1, len: -1 }).i;
  useThumb(ref, active);
  return (
    <header style={{ viewTransitionName: "app-header" }} className="sticky top-0 z-10 border-b border-line bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6">
        <Link href="/" aria-label="Inicio de Continuum"><Logo size={26} /></Link>
        <nav ref={ref} aria-label="Secciones" className="relative flex gap-1">
          <span data-thumb className="rounded-lg bg-surface" />
          {links.map((l, i) => (
            <Link key={l.href} href={l.href} data-item transitionTypes={["tab"]} aria-current={i === active ? "page" : undefined}
              className={`relative z-10 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300 ${i === active ? "text-ink" : "text-muted hover:text-ink"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline-flex"><NetworkChip /></span>
          <Link href="/" aria-label="Cambiar de usuario" title="Cambiar de usuario" className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface">
            <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">{name ? initials(name) : ""}</span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="max-w-[180px] truncate text-[13px] font-semibold">{name ?? ""}</span>
              <span className="text-[11px] text-muted">{role}</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
