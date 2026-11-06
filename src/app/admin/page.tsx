import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { SignOutButton } from "@/components/layout/SignOutButton";

// Provisional: el panel de administración se construye en la fase 5.
export default function AdminPage() {
  return (
    <main className="flex min-h-dvh flex-col items-start gap-6 bg-surface-muted p-9">
      <BrandMark />
      <h1 className="text-3xl">Panel de administración</h1>
      <p className="text-base text-muted">Estará disponible en la fase 5.</p>
      <SignOutButton className="flex items-center gap-2 text-base text-primary">
        <LogOut className="size-4" aria-hidden /> Cerrar sesión
      </SignOutButton>
    </main>
  );
}
