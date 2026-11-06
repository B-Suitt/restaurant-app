import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  /** Botón o icono a la derecha (cuadro gris de 34 px). */
  action?: ReactNode;
};

/** Cabecera de las vistas móviles (cliente y garzón). */
export function AppHeader({ title, subtitle, backHref, action }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-19 shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
      {backHref && (
        <Link href={backHref} aria-label="Volver" className="-m-2 p-2 text-ink">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="truncate text-xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Cuadro gris de 34 px para el icono de la cabecera. */
export function HeaderIcon({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <span
      aria-label={label}
      className="flex size-8.5 shrink-0 items-center justify-center rounded-md bg-surface-muted text-ink [&_svg]:size-4.5"
    >
      {children}
    </span>
  );
}
