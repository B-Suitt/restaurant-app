"use client";

import { cn } from "@/lib/cn";

type FilterTabsProps<T extends string | null> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

/** Filtros en píldora (Todo / Fondos / Bebidas…): la opción activa en negro. */
export function FilterTabs<T extends string | null>({ options, value, onChange, label }: FilterTabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.75" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value ?? "all"}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-full px-3.25 py-2.5 text-sm font-semibold transition-colors",
            value === option.value ? "bg-ink text-white" : "bg-surface-muted text-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
