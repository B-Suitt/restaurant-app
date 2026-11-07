"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type PaginationProps = {
  page: number; // desde 1
  pageSize: number;
  total: number;
  noun: string; // "mesas", "pedidos"…
  onChange: (page: number) => void;
};

/** "Mostrando 6 de 12 mesas" + "← Anterior 1 2 Siguiente →". */
export function Pagination({ page, pageSize, total, noun, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const shown = Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize));
  const link = "flex cursor-pointer items-center gap-1 text-base text-ink disabled:cursor-default disabled:text-subtle";

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-md text-muted">
        Mostrando {shown} de {total} {noun}
      </p>
      {pages > 1 && (
        <nav aria-label="Paginación" className="flex items-center gap-4">
          <button type="button" className={link} disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ArrowLeft className="size-4" aria-hidden /> Anterior
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onChange(p)}
              className={cn("cursor-pointer text-base", p === page ? "font-bold text-ink" : "text-muted hover:text-ink")}
            >
              {p}
            </button>
          ))}
          <button type="button" className={link} disabled={page >= pages} onClick={() => onChange(page + 1)}>
            Siguiente <ArrowRight className="size-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

/** Elementos de una página (desde 1). */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
