"use client";

import { cn } from "@/lib/cn";

type ToggleRowProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  disabled?: boolean;
};

/** Fila gris con un interruptor de texto: "Habilitada para el servicio · Activada ●". */
export function ToggleRow({ label, checked, onChange, onLabel = "Activada", offLabel = "Desactivada", disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-4 py-3.5">
      <span className="text-base font-semibold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex cursor-pointer items-center gap-2 text-base disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "text-primary" : "text-muted",
        )}
      >
        {checked ? onLabel : offLabel}
        <span
          className={cn("size-2.5 rounded-full border-2", checked ? "border-primary bg-primary" : "border-muted")}
          aria-hidden
        />
      </button>
    </div>
  );
}
