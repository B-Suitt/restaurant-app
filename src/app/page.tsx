import Image from "next/image";
import { APP_NAME } from "@/lib/restaurant";

// Portada provisional; cada rol entra por su propia ruta (/m/[qrToken], /garzon, /cocina, /admin).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-5 text-center">
      <Image src="/emblema.png" alt="" width={48} height={48} className="size-12" priority />
      <h1 className="text-xl">{APP_NAME}</h1>
      <p className="text-base text-muted">Escanea el código QR de tu mesa para ver la carta.</p>
    </main>
  );
}
