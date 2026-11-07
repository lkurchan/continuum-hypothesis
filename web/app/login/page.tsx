import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { publicDemoEnabled, safeNext } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar · Continuum", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = (await searchParams).next;
  if (publicDemoEnabled()) redirect(next ? safeNext(next) : "/demo");
  return <LoginForm next={safeNext(next)} />;
}
