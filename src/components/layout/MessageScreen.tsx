import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/BrandMark";

type MessageScreenProps = {
  /** Icono de Lucide, en el mismo recuadro rojo suave que la pantalla de QR inválido. */
  icon: ReactNode;
  title: string;
  children: ReactNode;
  /** Botones o enlaces para salir de la pantalla. */
  actions: ReactNode;
};

/** Pantalla completa de aviso (error, página no encontrada). Mismo estilo que `InvalidQrScreen`. */
export function MessageScreen({ icon, title, children, actions }: MessageScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-5 pt-14">
      <BrandMark />
      <span className="flex size-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary [&_svg]:size-8">
        {icon}
      </span>
      <h1 className="text-4xl">{title}</h1>
      <p className="text-lg text-muted">{children}</p>
      <div className="flex flex-col gap-3">{actions}</div>
    </main>
  );
}
