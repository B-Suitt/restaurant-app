import { Utensils } from "lucide-react";
import { APP_NAME } from "@/lib/restaurant";

// Portada provisional; cada rol entra por su propia ruta (/m/[qrToken], /garzon, /cocina, /admin).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-5 text-center">
      <div className="flex size-12 items-center justify-center rounded-sm bg-primary text-white">
        <Utensils className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl">{APP_NAME}</h1>
      <p className="text-base text-muted">Escanea el código QR de tu mesa para ver la carta.</p>
    </main>
  );
}
