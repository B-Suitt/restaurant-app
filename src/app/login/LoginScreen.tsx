"use client";

import { useSearchParams } from "next/navigation";
import { ShieldCheck, UserRound } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { BrandMark } from "@/components/layout/BrandMark";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { LoginForm } from "./LoginForm";

export type LoginVariant = "team" | "admin";

const COPY = {
  team: {
    eyebrow: `Equipo · ${RESTAURANT_NAME}`,
    headline: "Cada plato cuenta.",
    pitch: "Todo el servicio en una sola vista. Menos ruido, más cocina.",
    tagline: "Hecho para el ritmo de tu servicio.",
    badge: "Acceso equipo",
    title: "Listos para el servicio.",
    intro: "Ingresa con la cuenta asignada por el administrador.",
  },
  admin: {
    eyebrow: `Administración · ${RESTAURANT_NAME}`,
    headline: "Tu restaurante, en perfecto orden.",
    pitch: "Mesas, carta y equipo conectados para ofrecer un servicio que se nota.",
    tagline: "Una operación clara. Una mejor experiencia en cada mesa.",
    badge: "Acceso administrador",
    title: "Hola de nuevo.",
    intro: "Ingresa para tener el control de tu operación.",
  },
};

/** Elige la variante según la ruta a la que se intentaba entrar (?next=/admin…). */
export function LoginScreenFromUrl() {
  const next = useSearchParams().get("next");
  return <LoginScreen variant={next?.startsWith("/admin") ? "admin" : "team"} />;
}

// Móvil: diseño "Garzón · Acceso". Pantalla ancha: diseño dividido de "Cocina · Acceso" o "Administrador · Acceso".
export function LoginScreen({ variant }: { variant: LoginVariant }) {
  const copy = COPY[variant];
  const BadgeIcon = variant === "admin" ? ShieldCheck : UserRound;

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
        <p className="text-md uppercase">{copy.eyebrow}</p>
        <h2 className="mt-4 text-[44px] leading-tight">{copy.headline}</h2>
        <p className="text-lg text-subtle">{copy.pitch}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen decorativa de demo */}
        <img src="/demo/bienvenida.jpg" alt="" className="mt-4 h-85 w-full rounded-lg object-cover" />
        <p className="mt-auto text-md text-subtle">{copy.tagline}</p>
      </aside>

      <main className="flex flex-1 flex-col p-5 lg:items-center lg:justify-center lg:p-11">
        <div className="flex w-full max-w-97.5 flex-col gap-6">
          <div className="flex flex-col gap-6 pt-9 pb-3 lg:pt-0">
            <BrandMark className="lg:hidden" />
            <p className="hidden items-center gap-2 text-md uppercase text-primary lg:flex">
              <BadgeIcon className="size-4.5" aria-hidden /> {copy.badge}
            </p>
            <h1 className="text-4xl">{copy.title}</h1>
            <p className="text-lg text-muted">{copy.intro}</p>
          </div>
          <LoginForm
            footnote={
              variant === "admin"
                ? "Sesión segura · Acceso según permisos de tu rol."
                : "¿Necesitas acceso? Habla con tu administrador."
            }
          />
        </div>
      </main>
    </div>
  );
}
