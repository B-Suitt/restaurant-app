"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** Icono de Lucide; se muestra en un recuadro rojo suave. */
  icon?: ReactNode;
  /** Contenido extra y acciones (botones a ancho completo). */
  children?: ReactNode;
  className?: string;
};

/** Modal sobre <dialog> nativo: foco atrapado, Esc para cerrar y clic en el fondo. */
export function Modal({ open, onClose, title, description, icon, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clic en el fondo (fuera del panel) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      className={cn(
        "m-auto w-[calc(100%-2.5rem)] max-w-87.5 rounded-xl bg-surface p-0 text-ink",
        "backdrop:bg-overlay",
        className,
      )}
    >
      <div className="flex flex-col gap-4.5 p-6">
        {icon && (
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-7">
            {icon}
          </div>
        )}
        <h2 id={titleId} className="text-2xl">
          {title}
        </h2>
        {description && <div className="text-base text-muted">{description}</div>}
        {children}
      </div>
    </dialog>
  );
}
