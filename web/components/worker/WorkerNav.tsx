"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icon } from "@/components/ui/kit";
import { useThumb } from "@/components/ui/motion";

const items = [
  { href: "/worker", label: "Inicio", icon: "home" },
  { href: "/worker/actividad", label: "Actividad", icon: "list" },
  { href: "/worker/copiloto", label: "Copiloto", icon: "chat" },
] as const;

export function WorkerNav() {
  const path = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const active = items.findIndex((item) => item.href === path);
  useThumb(ref, active);
  if (path.startsWith("/worker/retirar")) return null;
  return (
    <nav aria-label="Navegación principal" style={{ viewTransitionName: "worker-nav" }}
      className="sticky bottom-0 shrink-0 border-t border-track bg-white/80 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl backdrop-saturate-150">
      <div ref={ref} className="relative grid grid-cols-3">
        <span data-thumb className="rounded-2xl bg-surface" />
        {items.map((item) => {
          const on = item.href === path;
          return (
            <Link key={item.href} href={item.href} data-item transitionTypes={["tab"]} aria-current={on ? "page" : undefined}
              className={`relative z-10 flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-300 active:scale-95 ${on ? "font-semibold text-ink" : "font-medium text-subtle"}`}>
              <Icon name={item.icon} size={22} className={`transition-transform duration-500 ease-spring ${on ? "scale-110" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
