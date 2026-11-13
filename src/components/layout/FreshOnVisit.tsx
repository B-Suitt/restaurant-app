"use client";

import { Fragment, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Formulario limpio en cada visita nueva (enlace, push o replace); con atrás/adelante conserva lo escrito.
 *
 * Con `cacheComponents`, Next.js oculta la página que se deja en vez de desmontarla y guarda su estado:
 * sin esto, el login quedaba con el botón cargando al cerrar sesión y un formulario de creación
 * volvía con los datos (y el id) del registro anterior.
 * Ver node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md (`bfcacheId`).
 */
export function FreshOnVisit({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
