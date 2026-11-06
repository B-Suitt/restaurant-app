import { LoaderCircle, QrCode } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

// Pantallas de carga y error de la vista del cliente (versión simple; se pulen en la fase 6).

export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-muted" role="status">
      <LoaderCircle className="size-6 animate-spin" aria-hidden />
      <p className="text-base">Preparando tu mesa…</p>
    </div>
  );
}

export function InvalidQrScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-5 pt-14">
      <BrandMark />
      <span className="flex size-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
        <QrCode className="size-8" aria-hidden />
      </span>
      <h1 className="text-4xl">No pudimos abrir tu mesa.</h1>
      <p className="text-lg text-muted">{message}</p>
      <p className="text-base text-muted">Pídele ayuda a un garzón o vuelve a escanear el código de tu mesa.</p>
    </div>
  );
}
