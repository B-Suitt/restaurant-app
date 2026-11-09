import { DoorClosed } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

// Destino del cliente al cerrarse su mesa (Figma no la tiene: mismo estilo que el QR inválido).
// No lleva el código de la mesa: recargarla no vuelve a abrirla.
export default function ThanksPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 bg-surface p-5 pt-14">
      <BrandMark />
      <span className="flex size-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
        <DoorClosed className="size-8" aria-hidden />
      </span>
      <h1 className="text-4xl">Gracias por tu visita.</h1>
      <p className="text-lg text-muted">Tu mesa ya fue cerrada, así que no se pueden hacer nuevos pedidos.</p>
      <p className="text-base text-muted">
        Si sigues en el restaurante y quieres pedir algo más, vuelve a escanear el código QR de tu mesa.
      </p>
    </div>
  );
}
