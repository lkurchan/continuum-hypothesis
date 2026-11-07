"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/kit";

const items = [
  { href: "/worker", label: "Inicio", icon: "home" },
  { href: "/worker/actividad", label: "Actividad", icon: "list" },
  { href: "/worker/copiloto", label: "Copiloto", icon: "chat" },
] as const;

export function WorkerNav() {
  const path = usePathname();
  if (path.startsWith("/worker/retirar")) return null;
  return (
    <nav aria-label="Navegación principal"
      className="sticky bottom-0 grid shrink-0 grid-cols-3 border-t border-track bg-white/95 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur">
      {items.map((item) => {
        const active = path === item.href;
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={`flex h-[68px] flex-col items-center justify-center gap-1 text-[11px] ${active ? "font-semibold text-ink" : "font-medium text-subtle"}`}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
