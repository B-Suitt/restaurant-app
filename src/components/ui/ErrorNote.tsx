import type { ReactNode } from "react";

/** Aviso rojo de error; no muestra nada si no hay mensaje. */
export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
      {children}
    </p>
  );
}
