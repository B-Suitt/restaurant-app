"use client";

import { TriangleAlert } from "lucide-react";
import { MessageScreen } from "@/components/layout/MessageScreen";
import { Button } from "@/components/ui/Button";
import "./globals.css";

// Error en el layout raíz: reemplaza toda la página, por eso define su propio <html> y <body>.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es-CL" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <title>Algo salió mal</title>
        <MessageScreen
          icon={<TriangleAlert aria-hidden />}
          title="Algo salió mal."
          actions={<Button onClick={() => retry()}>Reintentar</Button>}
        >
          No pudimos cargar la aplicación. Revisa tu conexión e inténtalo de nuevo.
        </MessageScreen>
      </body>
    </html>
  );
}
