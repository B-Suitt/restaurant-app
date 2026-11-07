"use client";

import { useState, type ReactNode } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { startShift } from "@/lib/shift-alerts";

/**
 * Muestra "Comenzar turno" sobre la vista hasta que la persona hace clic.
 * Ese clic habilita el sonido de las alertas y mantiene la pantalla encendida.
 */
export function ShiftStart({ children, description }: { children: ReactNode; description: string }) {
  const [started, setStarted] = useState(false);

  return (
    <>
      {children}
      {!started && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-title"
            className="flex w-full max-w-87.5 flex-col gap-4.5 rounded-xl bg-surface p-6"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <BellRing className="size-7" aria-hidden />
            </span>
            <h2 id="shift-title" className="text-2xl">
              Comenzar turno
            </h2>
            <p className="text-base text-muted">{description}</p>
            <Button
              autoFocus
              onClick={() => {
                // Se llama dentro del clic (el navegador exige un gesto para el sonido), pero sin esperarlo:
                // si el audio tarda o el navegador lo bloquea, el turno igual comienza.
                startShift().catch(() => {});
                setStarted(true);
              }}
            >
              Comenzar turno
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
