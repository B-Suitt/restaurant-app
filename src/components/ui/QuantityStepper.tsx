"use client";

import { Minus, Plus } from "lucide-react";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
};

/** Selector de cantidad: − 1 + */
export function QuantityStepper({ value, onChange, min = 1, max = 50, label = "Cantidad" }: QuantityStepperProps) {
  const button =
    "flex size-11 items-center justify-center text-ink disabled:text-subtle cursor-pointer disabled:cursor-default";
  return (
    <div role="group" aria-label={label} className="inline-flex h-11 items-center rounded-sm border border-border bg-surface">
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Quitar uno">
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span className="min-w-4 text-center text-base tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Agregar uno">
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
