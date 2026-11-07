"use client";

import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Field";
import { formatPrice } from "@/lib/format-price";

type PriceInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

/** Precio en CLP: se escribe solo con dígitos y se muestra como "$9.900". */
export function PriceInput({ value, onChange, ...props }: PriceInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={value === null ? "" : formatPrice(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
        onChange(digits ? Number(digits) : null);
      }}
    />
  );
}
