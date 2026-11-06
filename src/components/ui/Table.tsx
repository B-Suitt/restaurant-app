import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Tabla de las vistas de administrador: contenedor con borde y esquinas redondeadas. */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-surface">
      <table className={cn("w-full table-fixed border-collapse text-left", className)} {...props} />
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-surface-subtle [&_tr]:border-t-0" {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-t border-border", className)} {...props} />;
}

export function TableHeader({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "h-12 text-xs font-normal text-muted px-2 first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "h-17.5 py-3 text-md text-ink px-2 first:pl-5 last:pr-5 break-words",
        className,
      )}
      {...props}
    />
  );
}
