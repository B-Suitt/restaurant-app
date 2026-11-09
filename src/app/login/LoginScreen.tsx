"use client";

import { useSearchParams } from "next/navigation";
import { ChefHat, HandPlatter, ShieldCheck, UserRound } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/cn";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { LoginForm } from "./LoginForm";

type LoginVariant = "team" | "waiter" | "kitchen" | "admin";

const SERVICE_PITCH = {
  headline: "Cada plato cuenta.",
  pitch: "Todo el servicio en una sola vista. Menos ruido, más cocina.",
};

const COPY = {
  team: {
    ...SERVICE_PITCH,
    header: "Acceso del equipo",
    eyebrow: `Equipo · ${RESTAURANT_NAME}`,
    tagline: "Hecho para el ritmo de tu servicio.",
    badge: "Acceso equipo",
    badgeIcon: UserRound,
    title: "Listos para el servicio.",
    intro: "Ingresa con la cuenta asignada por el administrador.",
    footnote: "¿Necesitas acceso? Habla con tu administrador.",
  },
  waiter: {
    ...SERVICE_PITCH,
    header: "Equipo de sala",
    eyebrow: `Sala · ${RESTAURANT_NAME}`,
    tagline: "Hecho para el ritmo de tu sala.",
    badge: "Acceso sala",
    badgeIcon: HandPlatter,
    title: "Un gran servicio empieza contigo.",
    intro: "Ingresa para atender tus mesas, recibir avisos y llevar cada plato a tiempo.",
    footnote: "¿Necesitas acceso? Habla con tu administrador.",
  },
  kitchen: {
    ...SERVICE_PITCH,
    header: "Cocina",
    eyebrow: `Cocina · ${RESTAURANT_NAME}`,
    tagline: "Hecho para el ritmo de tu cocina.",
    badge: "Acceso cocina",
    badgeIcon: ChefHat,
    title: "Listos para el servicio.",
    intro: "Ingresa con la cuenta asignada a tu estación.",
    footnote: "¿No puedes ingresar? Contacta al administrador.",
  },
  admin: {
    header: "Administración",
    eyebrow: `Administración · ${RESTAURANT_NAME}`,
    headline: "Tu restaurante, en perfecto orden.",
    pitch: "Mesas, carta y equipo conectados para ofrecer un servicio que se nota.",
    tagline: "Una operación clara. Una mejor experiencia en cada mesa.",
    badge: "Acceso administrador",
    badgeIcon: ShieldCheck,
    title: "Hola de nuevo.",
    intro: "Ingresa para tener el control de tu operación.",
    footnote: "Sesión segura · Acceso según permisos de tu rol.",
  },
};

function variantFor(next: string | null): LoginVariant {
  if (next?.startsWith("/admin")) return "admin";
  if (next?.startsWith("/garzon")) return "waiter";
  if (next?.startsWith("/cocina")) return "kitchen";
  return "team";
}

/** Elige la variante según la ruta a la que se intentaba entrar (?next=/admin…). */
export function LoginScreenFromUrl() {
  return <LoginScreen variant={variantFor(useSearchParams().get("next"))} />;
}

// Móvil: diseño "Garzón · Acceso". Pantalla ancha: diseño dividido de "Cocina · Acceso" o "Administrador · Acceso".
export function LoginScreen({ variant }: { variant: LoginVariant }) {
  const copy = COPY[variant];
  const BadgeIcon = copy.badgeIcon;
  const isAdmin = variant === "admin";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="lg:hidden">
        <AppHeader
          title={copy.header}
          subtitle={RESTAURANT_NAME}
          action={
            <HeaderIcon>
              <UserRound aria-hidden />
            </HeaderIcon>
          }
        />
      </div>

      <aside className={cn("hidden w-[548px] shrink-0 flex-col gap-6 bg-ink p-11 text-white lg:flex", isAdmin && "xl:w-[660px] xl:p-14")}>
        <BrandMark inverted />
        <p className="text-md uppercase">{copy.eyebrow}</p>
        <h2 className={cn("mt-4 text-[44px] leading-tight", isAdmin && "xl:text-[56px] xl:leading-[1.35]")}>{copy.headline}</h2>
        <p className="text-lg text-subtle">{copy.pitch}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen decorativa de demo */}
        <img src="/demo/bienvenida.jpg" alt="" className="mt-4 h-85 w-full rounded-lg object-cover" />
        <p className="mt-auto text-md text-subtle">{copy.tagline}</p>
      </aside>

      <main className="flex flex-1 flex-col p-5 lg:items-center lg:justify-center lg:p-11">
        <div className="flex w-full max-w-97.5 flex-col gap-6">
          <div className="flex flex-col gap-6 pt-9 pb-3 lg:pt-0">
            <BrandMark className="lg:hidden" />
            {variant === "waiter" && (
              <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary lg:hidden">
                <HandPlatter className="size-8" aria-hidden />
              </span>
            )}
            <p className="hidden items-center gap-2 text-md uppercase text-primary lg:flex">
              <BadgeIcon className="size-4.5" aria-hidden /> {copy.badge}
            </p>
            <h1 className="text-4xl">{copy.title}</h1>
            <p className="text-lg text-muted">{copy.intro}</p>
          </div>
          <LoginForm footnote={copy.footnote} />
        </div>
      </main>
    </div>
  );
}
