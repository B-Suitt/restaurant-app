import type { Metadata } from "next";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { TableForm } from "../TableForm";

// Depende del id en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Editar mesa" };

export default async function Page({ params }: PageProps<"/admin/mesas/[tableId]">) {
  const { tableId } = await params;
  return (
    <FreshOnVisit>
      <TableForm tableId={tableId} />
    </FreshOnVisit>
  );
}
