"use client";

import { TriangleAlert } from "lucide-react";
import { MessageScreen } from "@/components/layout/MessageScreen";
import { Button } from "@/components/ui/Button";

// Error inesperado al mostrar una página. El detalle técnico no se muestra (en producción Next lo oculta).
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <MessageScreen
      icon={<TriangleAlert aria-hidden />}
      title="Algo salió mal."
      actions={
        <>
          <Button onClick={() => retry()}>Reintentar</Button>
          <Button variant="secondary" onClick={() => history.back()}>
            Volver
          </Button>
        </>
      }
    >
      No pudimos mostrar esta pantalla. Revisa tu conexión e inténtalo de nuevo.
    </MessageScreen>
  );
}
