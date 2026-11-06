"use client";

import Link from "next/link";
import { ArrowRight, ScanLine, Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { BrandMark } from "@/components/layout/BrandMark";
import { buttonClasses } from "@/components/ui/Button";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { ClientNav } from "./ClientNav";
import { tableLabel, useClientSession } from "./ClientSessionProvider";

const STEPS = [
  ["01 · Elige", "Tus favoritos de la carta."],
  ["02 · Pide", "Directo a nuestra cocina."],
  ["03 · Disfruta", "Te lo llevamos a la mesa."],
];

// Frame "Cliente · Bienvenida"
export function WelcomeView() {
  const { basePath, tableNumber, zone } = useClientSession();

  return (
    <>
      <AppHeader
        title="Bienvenido a tu mesa"
        subtitle={RESTAURANT_NAME}
        action={
          <HeaderIcon>
            <Utensils aria-hidden />
          </HeaderIcon>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <BrandMark />
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen de demo */}
        <img src="/demo/bienvenida.jpg" alt="" className="aspect-[350/300] w-full rounded-lg object-cover" />
        <p className="flex items-center gap-2 text-md uppercase text-primary">
          <ScanLine className="size-4.5" aria-hidden />
          {tableLabel(tableNumber)} · {zone}
        </p>
        <h2 className="text-4xl">La buena mesa empieza aquí.</h2>
        <p className="text-base text-muted">
          Explora la carta, pide a tu ritmo y sigue cada plato desde tu celular. Nosotros nos encargamos del resto.
        </p>
        <Link href={`${basePath}/menu`} className={buttonClasses()}>
          <ArrowRight className="size-5" aria-hidden /> Ver menú
        </Link>
        <ol className="grid grid-cols-3 gap-3">
          {STEPS.map(([title, text]) => (
            <li key={title} className="flex flex-col gap-2">
              <span className="text-md font-bold">{title}</span>
              <span className="text-xs text-muted">{text}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted">Sin registro. El pago se realiza en el restaurante.</p>
      </main>
      <ClientNav />
    </>
  );
}
