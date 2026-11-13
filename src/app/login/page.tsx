import type { Metadata } from "next";
import { Suspense } from "react";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { LoginScreen, LoginScreenFromUrl } from "./LoginScreen";

export const metadata: Metadata = { title: "Acceso del equipo" };

// La variante depende de ?next=: se lee en el navegador; mientras tanto se muestra la del equipo.
export default function LoginPage() {
  return (
    <FreshOnVisit>
      <Suspense fallback={<LoginScreen variant="team" />}>
        <LoginScreenFromUrl />
      </Suspense>
    </FreshOnVisit>
  );
}
