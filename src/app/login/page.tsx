import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { BrandMark } from "@/components/layout/BrandMark";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Acceso del equipo" };

// Móvil: diseño "Garzón · Acceso". Pantalla ancha: diseño dividido de "Cocina · Acceso".
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="lg:hidden">
        <AppHeader
          title="Acceso del equipo"
          subtitle={RESTAURANT_NAME}
          action={
            <HeaderIcon>
              <UserRound aria-hidden />
            </HeaderIcon>
          }
        />
      </div>

      <aside className="hidden w-[548px] shrink-0 flex-col gap-6 bg-ink p-11 text-white lg:flex">
        <BrandMark inverted />
        <p className="text-md uppercase">Equipo · {RESTAURANT_NAME}</p>
        <h2 className="mt-4 text-[44px] leading-tight">Cada plato cuenta.</h2>
        <p className="text-lg text-subtle">Todo el servicio en una sola vista. Menos ruido, más cocina.</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen decorativa de demo */}
        <img src="/demo/bienvenida.jpg" alt="" className="mt-4 h-85 w-full rounded-lg object-cover" />
        <p className="mt-auto text-md text-subtle">Hecho para el ritmo de tu servicio.</p>
      </aside>

      <main className="flex flex-1 flex-col p-5 lg:items-center lg:justify-center lg:p-11">
        <div className="flex w-full max-w-97.5 flex-col gap-6">
          <div className="flex flex-col gap-6 pt-9 pb-3 lg:pt-0">
            <BrandMark className="lg:hidden" />
            <p className="hidden items-center gap-2 text-md uppercase text-primary lg:flex">
              <UserRound className="size-4.5" aria-hidden /> Acceso equipo
            </p>
            <h1 className="text-4xl">Listos para el servicio.</h1>
            <p className="text-lg text-muted">Ingresa con la cuenta asignada por el administrador.</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
