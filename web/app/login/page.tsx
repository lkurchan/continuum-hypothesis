import type { Metadata } from "next";
import { safeNext } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar · Continuum", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  return <LoginForm next={safeNext((await searchParams).next)} />;
}
