"use client";

import { AppHeader } from "@/components/ui/AppHeader";
import { usePayer } from "./PayerContext";

const links = [
  { href: "/payer", label: "Acuerdos" },
  { href: "/payer/nuevo", label: "Nuevo acuerdo" },
];

export function PayerHeader() {
  const { user } = usePayer();
  return <AppHeader links={links} role="Cliente" name={user?.name} />;
}
