"use client";

import { AppHeader } from "@/components/ui/AppHeader";
import { useWorker } from "./WorkerContext";

const links = [
  { href: "/worker", label: "Inicio" },
  { href: "/worker/actividad", label: "Actividad" },
  { href: "/worker/copiloto", label: "Copiloto" },
];

/** Provider web header (the module keeps its own layout, PRD 6.1). */
export function WorkerNav() {
  const { user } = useWorker();
  return <AppHeader links={links} role="Proveedor" name={user?.name} />;
}
