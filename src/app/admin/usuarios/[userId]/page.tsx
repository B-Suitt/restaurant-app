import type { Metadata } from "next";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { UserForm } from "../UserForm";

// Depende del id en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Editar usuario" };

export default async function Page({ params }: PageProps<"/admin/usuarios/[userId]">) {
  const { userId } = await params;
  return (
    <FreshOnVisit>
      <UserForm userId={userId} />
    </FreshOnVisit>
  );
}
