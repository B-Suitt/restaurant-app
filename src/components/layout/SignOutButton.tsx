"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endShift } from "@/lib/shift-alerts";
import { cn } from "@/lib/cn";

/** Cierra la sesión del personal y vuelve al login. */
export function SignOutButton({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className={cn("cursor-pointer", className)}
      onClick={async () => {
        endShift(); // quien entre después comienza su propio turno
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
